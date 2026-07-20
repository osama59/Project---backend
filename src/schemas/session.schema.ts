import { z } from "zod";

export const SessionSchema = z.object({
  teacherId: z.string(),

  startTime: z.iso.datetime({ message: "Invalid date format. Use ISO 8601." }),
  endTime: z.iso.datetime({ message: "Invalid date format. Use ISO 8601." }),
});
