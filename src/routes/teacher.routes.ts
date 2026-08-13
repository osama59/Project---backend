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
          role: data.role,
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
          availabilities: data.availabilities,
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
      console.log(verifyCode);
      sendEmail(
        "noreply@resend.dev",
        "osamareema59@gmail.com",
        "verify email code",
        `<p>Your verification code is: <strong>${verifyCode}</strong></p>
               <p>Enter this code in the app to activate your account.</p>`,
      );

      return { user: { email: user.email }, teacher };
    });

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

    console.log("Token is correct ! : ", userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, languages: true },
    });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const { password, ...userWithoutPwd } = user;

    console.log("user: ", user);

    res.json(userWithoutPwd);
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
            age: true,
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

// GET /teacher/:id/availability?date=2026-07-20
router.get("/:id/availability", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Convert date string to Date object
    const selectedDate = new Date(date as string);
    const dayOfWeek = selectedDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase();

    // Fetch teacher's availability for that day
    // Here I think I have to fetch for the next 7 days instead !
    const availability = await prisma.availability.findMany({
      where: {
        teacherId: id,
        day: dayOfWeek as any, // "MONDAY", "TUESDAY", etc.
      },
    });

    // Fetch booked sessions for that teacher on that date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSessions = await prisma.session.findMany({
      where: {
        teacherId: id,
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
        },
      });

      const updatedTeacher = await tx.teacher.update({
        where: { userId: user.id },
        data: {
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
