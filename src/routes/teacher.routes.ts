import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import { TeacherRegisterSchema } from "../schemas/teacher.schema";
import jwt from "jsonwebtoken";
import { authenticateToken, getData } from "./helper";
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

    const hashedPw = await bcrypt.hash(data.password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPw,
          firstName: data.firstName,
          lastName: data.lastName,
          age: data.age,
          origin: data.origin,
          timeZone: data.timeZone,
          subjects: data.subjects,
          role: data.role,
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
            day: slot.dayOfWeek,
            fromTime: new Date(`1970-01-01T${slot.fromTime}:00.000Z`),
            toTime: new Date(`1970-01-01T${slot.toTime}:00.000Z`),
          })),
        });
      }

      return { user, teacher };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /teacher/login
router.post("/login", async (req, res) => {
  const data = getData(LoginSchema, req);
  if (!data) return res.status(400).json({ error: "Invalid input" });

  const { email, password } = data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { teacher: true },
    });

    if (!user || !user.teacher) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      teacher: user.teacher,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /teacher/teachers
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

// GET /teacher/teachers
router.get("/teachers", async (req: any, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      take: 10,
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
      },
    });

    console.log("teachers list: ", teachers);

    res.json(teachers);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
