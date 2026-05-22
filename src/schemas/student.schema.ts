import { z } from "zod";

export const StudentRegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string(),
  age: z.number(),
  origin: z.string(),
  timeZone: z.string(),
  preferedPriceMin: z.number(),
  preferedPriceMax: z.number(),
  subjects: z.string().array(),
  languages: z.array(
    z.object({
      name: z.string(),
      level: z.number().min(0).max(5),
      languageType: z.enum(["SPEAK", "TEACHE", "LEARN"]),
    }),
  ),
});
