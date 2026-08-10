import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken, getData } from "./helper";
import { json } from "zod";
import { MessageNewSchema } from "../schemas/messages.schema";

const router = Router();

// GET /messages/history?page=1&limit=10&secondUserId=1234
router.get("/history", authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const firstUserId = req.user.id;
    const secondUserId = req.query.secondUserId;
    const firstUser = await prisma.user.findUnique({
      where: { id: firstUserId },
    });

    if (!firstUser) {
      return res.status(403).json({ error: "no user found :(" });
    }
    const secondUser = await prisma.user.findUnique({
      where: { id: secondUserId },
    });

    if (!secondUser) {
      return res.status(403).json({ error: "no user found :(" });
    }

    const messages = await prisma.message.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: {
        OR: [
          {
            senderId: firstUserId,
            reciverId: secondUserId,
          },
          {
            senderId: secondUserId,
            reciverId: firstUserId,
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to get messages hsitory" });
  }
});

// POST /messages/new
router.post("/new", authenticateToken, async (req: any, res) => {
  try {
    const data = getData(MessageNewSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input..!" });
    const reciver = await prisma.user.findUnique({
      where: { id: data.reciverId },
    });
    if (!reciver) return res.status(400).json({ error: "no reciver found :(" });

    const newMessage = await prisma.message.create({
      data: {
        senderId: req.user.id,
        reciverId: data.reciverId,
        text: data.text,
      },
    });
    res.json(newMessage);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to make a new message" });
  }
});

export default router;
