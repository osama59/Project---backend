import { z } from "zod";

export const ReportSchema = z.object({
  reportedId: z.string(),
  category: z.array(z.string()),
  description: z.string(),
  messageId: z.string().optional(),
});
