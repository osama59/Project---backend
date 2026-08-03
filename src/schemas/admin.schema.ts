import { z } from "zod";

export const AdminUpdateStatus = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "APPROVED", "REJECTED", "SUSBENDED"]),
});
