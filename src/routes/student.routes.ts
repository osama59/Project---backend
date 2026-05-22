import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import { StudentRegisterSchema } from "../schemas/student.schema";
import { use } from "react";

const router = Router();

// POST /student/register
router.post("/register", async (req, res) => {
  // Validate input using Zod
  const parsed = StudentRegisterSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
    });
  }

  const data = parsed.data;

  try {
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

      const languages = await tx.language.createMany({
        data: data.languages.map((lang) => ({
          userId: user.id,
          name: lang.name,
          level: lang.level,
          languageType: lang.languageType,
        })),
      });

      return { user, student, languages };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});


export default router;
