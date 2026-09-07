import { email, z } from "zod";
import { AvailabilitySlotSchema } from "./teacher.schema";

export const GoogleRegisterSchema = z.object({
  idToken: z.string(),

  // USER FIELD
  birthDate: z.iso.datetime({ message: "Invalid date format. Use ISO 8601." }),
  origin: z.string(),
  timeZone: z.string(),
  subjects: z.array(z.string()),
  languages: z
    .array(
      z.object({
        name: z.string(),
        level: z.number().min(0).max(6),
        languageType: z.enum(["SPEAK", "TEACH", "LEARN"]),
      }),
    )
    .optional(),
  role: z.enum(["STUDENT", "TEACHER"]),

  // STUDENT FIELDS
  preferedPriceMin: z.number().optional(),
  preferedPriceMax: z.number().optional(),

  // TEACHER FIELDS
  introVideoUrl: z.url().optional(),
  introText: z.string().optional(),
  hourPrice: z.number().positive().optional(),
  certificateImageUrl: z.url().optional(),
  availability: z.array(AvailabilitySlotSchema).optional(),
});

export const verifyEmailSchema = z.object({
  email: z.email(),
  verifyCode: z.number(),
});

export const ResendVerificationSchema = z.object({
  email: z.email(),
});

export const ResetPwdSchema = z.object({
  email: z.email(),
  verifyCode: z.number(),
  newPassword: z.string(),
});

export const ChangePwdSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});
