import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import {
  StudentRegisterSchema,
  StudentUpdateSchema,
} from "../schemas/student.schema";
import {
  authenticateToken,
  getData,
  getSecureSixDigit,
  sendEmail,
} from "./helper";
import { verificationEmailHtml } from "../email/emailTemplates";

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
          profileImageUrl: data.profileImageUrl,
          verifyCode: verifyCode,
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

      return { user: { email: user.email }, student };
    });

    console.log(verifyCode);
    const assetBaseUrl = process.env.ASSET_BASE_URL!;
    // ------TEMP Double email test section------

    await sendEmail(
      `"Fluenzy" <noreply@fluenzy.me>`,
      "hayatalouda777@gmail.com",
      "رمز التحقق الخاص بك في Fluenzy",
      verificationEmailHtml({ code: verifyCode, assetBaseUrl }),
    );

    await sendEmail(
      `"Fluenzy" <noreply@fluenzy.me>`,
      "aliazaldeeeen@gmail.com",
      "رمز التحقق الخاص بك في Fluenzy",
      verificationEmailHtml({ code: verifyCode, assetBaseUrl }),
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
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

    // If the user is trying to change their email
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "Email already in use by another account" });
      }
    }

    // Inside PATCH /student/profile, after fetching the user
    if (user.role !== "STUDENT") {
      return res
        .status(400)
        .json({ error: "This endpoint is for students only" });
    }

    const studentRecord = await prisma.student.findUnique({
      where: { userId: user.id },
    });
    if (!studentRecord) {
      return res.status(404).json({ error: "Student profile not found" });
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
