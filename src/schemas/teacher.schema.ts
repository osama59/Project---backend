import { z } from "zod";
import { UserBaseSchema } from "./user.schema";

// 🔹 Define the day of week enum (matches your database ENUM)
const DayOfWeekEnum = z.enum([
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);

// 🔹 Define a single availability slot
export const AvailabilitySlotSchema = z.object({
  day: DayOfWeekEnum,
  fromTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Invalid time format. Use HH:mm (e.g., 09:00)",
  }),
  toTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Invalid time format. Use HH:mm (e.g., 17:00)",
  }),
});

export const TeacherRegisterSchema = UserBaseSchema.extend({
  certificateImageUrl: z.url().optional(),
  introVideoUrl: z.url().optional(),
  introText: z.string(),
  hourPrice: z.number().positive(),
  availability: z.array(AvailabilitySlotSchema),
});

export const TeacherUpdateSchema = z.object({
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.date(),
  origin: z.string(),
  profileImageUrl: z.url().optional(),
  timeZone: z.string(),
  subjects: z.array(z.string()),
  languages: z.array(
    z.object({
      name: z.string(),
      level: z.number().min(0).max(5),
      languageType: z.enum(["SPEAK", "TEACH"]),
    }),
  ),
  introVideoUrl: z.url().optional(),
  introText: z.string(),
  hourPrice: z.number().positive(),
  availability: z.array(AvailabilitySlotSchema),
});
