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
    
    await client.getFederatedSignonCertsAsync();
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = payload?.email;
    const firstName = payload?.given_name || "";
    const lastName = payload?.family_name || "";
    const profileImageUrl = payload?.picture;
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

      const teacher = await prisma.teacher.findUnique({
        where: { userId: existingUser.id },
      });

      if (teacher) {
        if (existingUser.status != "APPROVED") {
          return res.status(400).json({ error: "Wait until approaved" });
        }
      }

      const token = generateToken(existingUser);

      return res.json({
        token: token,
        id: existingUser.id,
        role: existingUser.role,
        status: existingUser.status,
      });
    } else {
      const data = getData(GoogleRegisterSchema, req);
      if (!data)
        return res.status(400).json({ error: "The user is not signd up yet" });
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
            profileImageUrl: profileImageUrl,
            // The user email is confirmed by google
            status: "CONFIRMED",
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
            token: token,
            id: user.id,
            role: user.role,
            status: user.status,
          };
        } else if (data.role == "TEACHER") {
          const teacher = await tx.teacher.create({
            data: {
              userId: user.id,
              certificateImageUrl: data.certificateImageUrl,
              introVideoUrl: data.introVideoUrl,
              introText: data.introText,
              hourPrice: data.hourPrice,
            },
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

          const token = generateToken(user);
          return {
            //teachers must be verifide before gettinng a token
            token: "",
            id: user.id,
            role: user.role,
            status: user.status,
          };
        } else {
          return { error: "BAD REQUEST" };
        }
      });
      return res.json(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "something went wrong" });
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
        // TEST CODE
        verifyCode: 111111,
      },
    });
    const assetBaseUrl = process.env.ASSET_BASE_URL!;

    console.log(verifyCode);
    // ------TEMP Double email test section------

    await sendEmail(
      `"Fluenzy" <noreply@fluenzy.me>`,
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
