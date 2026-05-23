import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import {
  StudentLoginSchema,
  StudentRegisterSchema,
} from "../schemas/student.schema";
import jwt from "jsonwebtoken";
const router = Router();

// POST /student/register
router.post("/register", async (req, res) => {
  const data = getData(StudentRegisterSchema, req, res);

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
        data: data.languages.map((lang: any) => ({
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

// POST /student/login
router.post("/login", async (req, res) => {
  const data = getData(StudentLoginSchema, req, res);
  if (!data) return; // stop if validation failed

  const { email, password } = data;

  try {
    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { student: true },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 3. Create JWT payload (minimal)
    const payload = {
      id: user.id,
      role: "STUDENT",
    };

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
      expiresIn: "7d",
    });

    // 4. Return clean response
    return res.json({
      accessToken,
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
    return res.status(500).json({ error: "Login failed" });
  }
});

export default router;

function getData(schema: any, req: any, res: any) {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    console.error("error: Invalid input");
    return res.status(400).send("error");
  }

  const data = parsed.data;
  return data;
}
