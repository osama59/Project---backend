import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken, generateToken, getData } from "./helper";
import bcrypt from "bcryptjs";
import { ReportSchema } from "../schemas/report.schema";

const router = Router();

// POST report/
router.post("/", authenticateToken, async (req: any, res) => {
  try {
    const data = getData(ReportSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input..!" });

    const reported = await prisma.user.findUnique({
      where: { id: data.reportedId },
    });
    if (!reported)
      return res.status(400).json({ error: "no reported user found :(" });

    const newReport = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        reportedId: data.reportedId,
        category: data.category,
        description: data.description,
        messageId: data.messageId,
      },
    });
    res.json(newReport);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to make a new report :(" });
  }
});

export default router;
