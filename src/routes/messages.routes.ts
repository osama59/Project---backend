import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken, getData } from "./helper";
import { MessageNewSchema } from "../schemas/messages.schema";
import { ro } from "@faker-js/faker";

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

// GET /messages/conversations?page=1&limit=10
router.get("/conversations", authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(403).json({ error: "no user found :(" });
    }

    const conversations = await prisma.$queryRaw<any[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (partner_id)
        partner_id AS "partnerId",
        text AS "lastMessage",
        "createdAt" AS "lastMessageTime"
      FROM (
        SELECT
          CASE
            WHEN "senderId" = ${user.id} THEN "reciverId"
            ELSE "senderId"
          END AS partner_id,
          text,
          "createdAt"
        FROM "Message"
        WHERE "senderId" = ${user.id} OR "reciverId" = ${user.id}
      ) AS inner_messages
      ORDER BY partner_id , "createdAt" DESC
    )AS latest_conversations
    ORDER BY "lastMessageTime" DESC
    OFFSET ${skip}
    LIMIT ${limit}
    `;

    if (conversations.length === 0) {
      return res.json([]);
    }

    const unreadMessagesCount =
      await prisma.$queryRaw`SELECT "senderId",COUNT(*) FROM "Message" WHERE 
      "reciverId" = ${user.id} AND "isRead" = false GROUP BY "senderId"`;

    const unreadMap = new Map<string, number>();
    (unreadMessagesCount as any[]).forEach((row: any) => {
      unreadMap.set(row.senderId, Number(row.count));
    });

    const partnerIds = conversations.map((c) => c.partnerId);
    const users = await prisma.user.findMany({
      where: { id: { in: partnerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
      },
    });

    const result = conversations.map((conv) => ({
      ...conv,
      unreadCount: unreadMap.get(conv.partnerId) || 0,
      user: users.find((u) => u.id === conv.partnerId) || null,
    }));

    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to get conversations" });
  }
});

// PATCH /messages/read/:senderId
router.patch("/read/:senderId", authenticateToken, async (req: any, res) => {
  try {
    const { senderId } = req.params;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      return res.status(404).json({ error: "user profile not found" });
    }

    const result = await prisma.message.updateMany({
      where: { senderId: senderId, reciverId: req.user.id },
      data: {
        isRead: true,
      },
    });
    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to make messages marked as read" });
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
