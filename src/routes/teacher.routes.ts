import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import {
  TeacherRegisterSchema,
  TeacherUpdateSchema,
} from "../schemas/teacher.schema";
import {
  authenticateToken,
  generateToken,
  getData,
  getSecureSixDigit,
  sendEmail,
} from "./helper";
import { LoginSchema } from "../schemas/user.schema";
import { verificationEmailHtml } from "../email/emailTemplates";
import { sendEmailNodemailer } from "../nodemailer_email";

const router = Router();

// POST /teacher/register
router.post("/register", async (req, res) => {
  const data = getData(TeacherRegisterSchema, req);
  if (!data) return res.status(400).json({ error: "Invalid input" });

  try {
    // Check duplicate email
    const exists = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) return res.status(400).json({ error: "Email already exists" });

    const verifyCode = getSecureSixDigit();
    const hashedPw = await bcrypt.hash(data.password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPw,
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: data.birthDate,
          origin: data.origin,
          timeZone: data.timeZone,
          subjects: data.subjects,
          role: "TEACHER",
          profileImageUrl: data.profileImageUrl,
          verifyCode: verifyCode,
        },
      });
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          certificateImageUrl: data.certificateImageUrl,
          introVideoUrl: data.introVideoUrl,
          introText: data.introText,
          hourPrice: data.hourPrice,
        },
      });

      await tx.language.createMany({
        data: data.languages.map((lang: any) => ({
          userId: user.id,
          name: lang.name,
          level: lang.level,
          languageType: lang.languageType,
        })),
      });

      // 3. Create Availability Slots
      if (data.availability && data.availability.length > 0) {
        await tx.availability.createMany({
          data: data.availability.map((slot: any) => ({
            teacherId: teacher.id,
            day: slot.day,
            fromTime: new Date(`1970-01-01T${slot.fromTime}:00.000Z`),
            toTime: new Date(`1970-01-01T${slot.toTime}:00.000Z`),
          })),
        });
      }
      return { user: { email: user.email }, teacher };
    });

    const assetBaseUrl = process.env.ASSET_BASE_URL!;

    await sendEmail(
      `"Fluenzy" <noreply@fluenzy.me>`,
      data.email,
      "رمز التحقق الخاص بك في Fluenzy",
      verificationEmailHtml({ code: verifyCode, assetBaseUrl }),
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// GET /teacher/me
router.get("/me", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, languages: true },
    });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const { password, ...userWithoutPwd } = user;

    const ratings = await prisma.rating.findMany({
      where: {
        teacherId: user.teacher?.id,
      },
      select: {
        rating: true,
      },
    });

    var totalRating = 0;
    var avgRating;
    ratings.forEach((rating) => {
      totalRating += rating.rating;
    });
    totalRating > 0
      ? (avgRating = totalRating / ratings.length)
      : (avgRating = 0);

    res.json({ userWithoutPwd, avgRating });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// GET /teacher/teachers?page=1&limit=10
router.get("/teachers", authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      include: { user: { include: { languages: true } } },
    });

    const studentLearningLang = (student?.user.languages || [])
      .filter((lang: any) => lang.languageType === "LEARN")
      .map((lang: any) => lang.name);

    const teachers = await prisma.teacher.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: {
        user: {
          subjects: {
            hasSome: student?.user.subjects,
          },
          languages: {
            some: {
              name: { in: studentLearningLang },
              languageType: "TEACH",
            },
          },
          status: "APPROVED",
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            origin: true,
            profileImageUrl: true,
            timeZone: true,
            subjects: true,
            languages: true,
          },
        },
        availabilities: true,
        ratings: { select: { rating: true } },
      },
    });

    const teachersWithRatings = teachers.map((teacher) => {
      const ratingsArray = teacher.ratings.map((r) => r.rating);
      const avgRating =
        ratingsArray.length > 0
          ? ratingsArray.reduce((a, b) => a + b, 0) / ratingsArray.length
          : null;

      const { ratings, ...teacherWithoutRating } = teacher;
      return {
        ...teacherWithoutRating,
        avgRating: avgRating,
        totalReviews: ratingsArray.length,
      };
    });

    const total = await prisma.teacher.count({
      where: {
        user: {
          subjects: {
            hasSome: student?.user.subjects,
          },
          languages: {
            some: {
              name: { in: studentLearningLang },
              languageType: "TEACH",
            },
          },
          status: "APPROVED",
        },
      },
    });

    res.json({
      teachersWithRatings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// GET /teacher/:id/ratings?page=1&limit=10
router.get("/:id/ratings", async (req: any, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const id = req.params.id;

    const teacher = await prisma.teacher.findUnique({
      where: { userId: id },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    const ratings = await prisma.rating.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: {
        teacherId: teacher.id,
      },
      include: {
        student: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });
    const total = await prisma.rating.count({
      where: { teacherId: teacher.id },
    });
    res.json({
      ratings,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

// GET /teacher/:id/availability?startDate=2026-08-20&endDate=2026-08-30
router.get("/:id/availability", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const teacher = await prisma.teacher.findUnique({
      where: { userId: id },
    });

    if (!teacher) {
      return res.status(400).json({ error: "no teacher with this id :(" });
    }

    if (!(startDate && endDate)) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Fetch booked sessions for that teacher on that date
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startOfDay < today) {
      return res
        .status(400)
        .json({ error: "Cannot fetch availability for past dates" });
    }

    // There's only 7 days a week so no need to fetch by day :)
    const availability = await prisma.availability.findMany({
      where: {
        teacherId: teacher.id,
      },
    });

    const bookedSessions = await prisma.session.findMany({
      where: {
        teacherId: teacher.id,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: "CANCELLED", // Optional: exclude cancelled sessions
        },
      },
    });

    res.json({
      availability,
      bookedSessions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// PATCH /teacher/profile
router.patch("/profile", authenticateToken, async (req: any, res) => {
  try {
    const data = getData(TeacherUpdateSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacher: true, languages: true },
    });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    if (user.role !== "TEACHER") {
      return res
        .status(403)
        .json({ error: "Access denied. This endpoint is for teachers only." });
    }
    if (!user.teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: data.birthDate,
          origin: data.origin,
          timeZone: data.timeZone,
          subjects: data.subjects,
          profileImageUrl: data.profileImageUrl,
        },
      });

      const updatedTeacher = await tx.teacher.update({
        where: { userId: user.id },
        data: {
          certificateImageUrl: data.certificateImageUrl,
          introVideoUrl: data.introVideoUrl,
          introText: data.introText,
          hourPrice: data.hourPrice,
        },
      });

      await tx.language.deleteMany({
        where: { userId: user.id },
      });

      await tx.language.createMany({
        data: data.languages.map((lang: any) => ({
          userId: user.id,
          name: lang.name,
          level: lang.level,
          languageType: lang.languageType,
        })),
      });

      await tx.availability.deleteMany({
        where: { teacherId: user.teacher!.id },
      });

      await tx.availability.createMany({
        data: data.availability.map((slot: any) => ({
          teacherId: updatedTeacher.id,
          day: slot.day,
          fromTime: new Date(`1970-01-01T${slot.fromTime}:00.000Z`),
          toTime: new Date(`1970-01-01T${slot.toTime}:00.000Z`),
        })),
      });

      return { updatedTeacher, updatedUser };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
