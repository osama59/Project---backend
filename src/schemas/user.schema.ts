import { z } from "zod";

export const UserBaseSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.date(),
  origin: z.string(),
  profileImageUrl: z.url().optional(),
  timeZone: z.string(),
  role: z.enum(["STUDENT", "TEACHER"]).optional(),
  subjects: z.array(z.string()),
  languages: z.array(
    z.object({
      name: z.string(),
      level: z.number().min(0).max(5),
      languageType: z.enum(["SPEAK", "TEACH", "LEARN"]),
    }),
  ),
  status: z.enum(["PENDING", "CONFIRMED", "APPROVED", "REJECTED", "SUSBENDED"]),
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Password required"),
});
