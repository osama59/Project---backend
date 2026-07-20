import { z } from "zod";

export const SessionSchema = z.object({
  teacherId: z.string(),

  startTime: z.iso.datetime({ message: "Invalid date format. Use ISO 8601." }),
  endTime: z.iso.datetime({ message: "Invalid date format. Use ISO 8601." }),
});

export const SessionUpdateSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
});

export const SessionRateSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});
