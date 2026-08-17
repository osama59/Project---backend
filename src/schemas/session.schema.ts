import { z } from "zod";

export const SessionSchema = z.object({
  teacherId: z.string(),
  startTime: z.iso.datetime({ message: "Invalid date format. Use ISO 8601." }),
  endTime: z.iso.datetime({ message: "Invalid date format. Use ISO 8601." }),
});

export const SessionUpdateSchema = z.object({
  realStartTime: z.iso
    .datetime({ message: "Invalid date format. Use ISO 8601." })
    .optional(),
  realEndTime: z.iso
    .datetime({ message: "Invalid date format. Use ISO 8601." })
    .optional(),
  // Dangerous status update
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED"]),
});

export const SessionRateSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});

export const CardPaymentSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/), // 16 digits
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expiryYear: z.string().regex(/^\d{2}$/),
  cvv: z.string().regex(/^\d{3,4}$/),
});
