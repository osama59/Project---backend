import { z } from "zod";

export const UserBaseSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.iso.datetime({ message: "Invalid date format. Use ISO 8601." }),
  origin: z.string(),
  profileImageUrl: z.url().optional(),
  timeZone: z.string(),
  subjects: z.array(z.string()),
  languages: z.array(
    z.object({
      name: z.string(),
      level: z.number().min(0).max(5),
      languageType: z.enum(["SPEAK", "TEACH", "LEARN"]),
    }),
  ),
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Password required"),
});

export const WithDrawSchema = z.object({
  amount: z.number().nonnegative(),
});
