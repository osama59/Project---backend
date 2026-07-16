import { z } from "zod";
import { UserBaseSchema } from "./user.schema";

export const StudentRegisterSchema = UserBaseSchema.extend({
  preferedPriceMin: z.number(),
  preferedPriceMax: z.number(),
});

