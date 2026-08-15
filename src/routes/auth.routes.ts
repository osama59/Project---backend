import { Router } from "express";
import { prisma } from "../prisma";
import {
  authenticateToken,
  generateToken,
  getData,
  getSecureSixDigit,
  sendEmail,
} from "./helper";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import {
  GoogleRegisterSchema,
  ResendVerificationSchema,
  verifyEmailSchema,
} from "../schemas/auth.schema";
import { verificationEmailHtml } from "../email/emailTemplates";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = Router();

// POST /auth/google
router.post("/google", async (req, res) => {
  try {
    const idToken = req.body.idToken;
    if (!idToken) {
      return res.status(400).json({ error: "BAD REQUEST" });
    }

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = payload?.email;
    const firstName = payload?.given_name || "";
    const lastName = payload?.family_name || "";
    const profileImageUrlmageUrl = payload?.picture;
    if (!payload || !googleId || !email) {
      return res.status(400).json({ error: "Invalid Google token payload" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      if (!existingUser.googleId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId: googleId,
          },
        });
      }

      const token = generateToken(existingUser);

      return res.json({
        token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        },
      });
    } else {
      const data = getData(GoogleRegisterSchema, req);
      if (!data) return res.status(400).json({ error: "Invalid input" });
      const dummyHashedPw = await bcrypt.hash(Math.random().toString(36), 10);
      const result = await prisma.$transaction(async (tx) => {
        const user = await prisma.user.create({
          data: {
            googleId: googleId,
            email: email,
            password: dummyHashedPw,
            firstName: firstName,
            lastName: lastName,
            birthDate: data.birthDate,
            origin: data.origin,
            timeZone: data.timeZone,
            subjects: data.subjects,
            profileImageUrl: profileImageUrlmageUrl,
            role: data.role,
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

        if (data.role == "STUDENT") {
          // This dangerois becouse alot of zod schema is optional :)
          const student = await tx.student.create({
            data: {
              userId: user.id,
              preferedPriceMin: data.preferedPriceMin,
              preferedPriceMax: data.preferedPriceMax,
            },
          });

          const token = generateToken(user);
          return {
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
            },
            student,
          };
        } else if (data.role == "TEACHER") {
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
          const token = generateToken(user);
          return {
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
            },
            teacher,
          };
        } else {
          return { error: "BAD REQUEST" };
        }
      });
      return res.json(result);
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// POST /auth/verify-email
router.post("/verify-email", async (req, res) => {
  try {
    const data = getData(verifyEmailSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input ....!" });

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      return res.status(400).json({ error: "Invalid email " });
    }

    if (user.status != "PENDING") {
      return res.status(400).json({ error: "User already verifide email " });
    }

    const isMatch = user.verifyCode === data.verifyCode;
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid code" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "CONFIRMED",
        verifyCode: 0,
      },
    });

    res.json({ msg: "Email verifide!" });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Something went wrong :(" });
  }
});

// Forget password ?
// POST /auth/resend-verification
router.post("/resend-verification", async (req, res) => {
  try {
    const data = getData(ResendVerificationSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input ....!" });

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      return res.status(400).json({ error: "Invalid email " });
    }

    const verifyCode = getSecureSixDigit();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        // TEST SECTION
        verifyCode: 111111,
      },
    });
    const assetBaseUrl = process.env.ASSET_BASE_URL!;

    console.log(verifyCode);
    // ------TEMP Double email test section------

    await sendEmail(
      "noreply@resend.dev",
      // user.email,
      "osamareema59@gmail.com",
      "رمز التحقق الخاص بك في Fluenzy",
      verificationEmailHtml({ code: verifyCode, assetBaseUrl }),
    );

    await sendEmail(
      "noreply@resend.dev",
      "aliazaldeeeen@gmail.com",
      "رمز التحقق الخاص بك في Fluenzy",
      verificationEmailHtml({ code: verifyCode, assetBaseUrl }),
    );

    res.json({ msg: "Code was re-sent!" });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Something went wrong :(" });
  }
});

export default router;
