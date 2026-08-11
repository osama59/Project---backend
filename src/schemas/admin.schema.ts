import { z } from "zod";

export const AdminUpdateStatus = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "APPROVED", "REJECTED", "SUSBENDED"]),
});

export const AdminUpdateReport = z.object({
  status: z.enum(["PENDING", "REVIEWD", "DISMISSED", "ACTION_TAKEN"]),
});
