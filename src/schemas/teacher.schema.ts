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
const AvailabilitySlotSchema = z.object({
  dayOfWeek: DayOfWeekEnum,
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
