import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import {
  StudentRegisterSchema,
  StudentUpdateSchema,
} from "../schemas/student.schema";
import { LoginSchema } from "../schemas/user.schema";
import jwt from "jsonwebtoken";
import { authenticateToken, getData } from "./helper";

const router = Router();

// POST /student/register
router.post("/register", async (req, res) => {
  const data = getData(StudentRegisterSchema, req);
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
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          preferedPriceMin: data.preferedPriceMin,
          preferedPriceMax: data.preferedPriceMax,
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

      return { user, student };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /student/login
router.post("/login", async (req, res) => {
  const data = getData(LoginSchema, req);
  if (!data) return res.status(400).json({ error: "Invalid input" });

  const { email, password } = data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { student: true },
    });

    if (!user || !user.student) {
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
      student: user.student,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /student/me
router.get("/me", authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true, languages: true },
  });

  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }

  const { password, ...userWithoutPwd } = user;

  console.log("user: ", user);

  res.json(userWithoutPwd);
});

// PATCH /student/profile
router.patch("/profile", authenticateToken, async (req: any, res) => {
  try {
    const data = getData(StudentUpdateSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { student: true, languages: true },
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
          age: data.age,
          origin: data.origin,
          timeZone: data.timeZone,
          subjects: data.subjects,
        },
      });

      const updatedStudent = await tx.student.update({
        where: { userId: user.id },
        data: {
          preferedPriceMax: data.preferedPriceMax,
          preferedPriceMin: data.preferedPriceMin,
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
      return { updatedStudent, updatedUser };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
