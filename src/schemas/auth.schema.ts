import { email, z } from "zod";
import { AvailabilitySlotSchema } from "./teacher.schema";

export const GoogleRegisterSchema = z.object({
  idToken: z.string(),

  // USER FIELD
  birthDate: z.date().optional(),
  origin: z.string().optional(),
  timeZone: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  languages: z
    .array(
      z.object({
        name: z.string(),
        level: z.number().min(0).max(5),
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
  availability: z.array(AvailabilitySlotSchema).optional(),
});

export const verifyEmailSchema = z.object({
  email: z.email(),
  verifyCode: z.number(),
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
