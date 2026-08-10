import { email, z } from "zod";
export const MessageNewSchema = z.object({
  reciverId: z.string(),
  text: z.string(),
});
