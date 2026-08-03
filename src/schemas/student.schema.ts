import { z } from "zod";
import { UserBaseSchema } from "./user.schema";

export const StudentRegisterSchema = UserBaseSchema.extend({
  preferedPriceMin: z.number(),
  preferedPriceMax: z.number(),
});

export const StudentUpdateSchema = z.object({
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  age: z.number(),
  origin: z.string(),
  profileImageUrl: z.url().optional(),
  timeZone: z.string(),
  subjects: z.array(z.string()),
  languages: z.array(
    z.object({
      name: z.string(),
      level: z.number().min(0).max(5),
      languageType: z.enum(["SPEAK", "LEARN"]),
    }),
  ),
  preferedPriceMin: z.number(),
  preferedPriceMax: z.number(),
});
