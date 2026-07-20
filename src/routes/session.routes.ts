import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken, getData } from "./helper";
import { SessionSchema } from "../schemas/session.schema";
import { id } from "zod/locales";
import { includes } from "zod";
const router = Router();

// POST session/book
router.post("/book", authenticateToken, async (req: any, res) => {
  try {
    const data = getData(SessionSchema, req);
    const teacherId = data.teacherId;
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const studentId = student.id;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "teacher not found" });
    }

    const availability = await prisma.availability.findMany({
      where: { teacherId: teacherId },
    });

    function getTimeOfDay(date: Date): number {
      return date.getHours() * 60 + date.getMinutes(); // Returns minutes since midnight
    }
    const requestedStart = getTimeOfDay(new Date(data.startTime));
    const requestedEnd = getTimeOfDay(new Date(data.endTime));

    let isWithInAvailabilty = false;
    for (const slot of availability) {
      const availStart = getTimeOfDay(slot.fromTime);
      const availEnd = getTimeOfDay(slot.toTime);

      if (requestedStart >= availStart && requestedEnd <= availEnd) {
        isWithInAvailabilty = true;
        break;
      }
    }
    if (isWithInAvailabilty == false) {
      return res
        .status(400)
        .json({ error: "Slot is outside your availability window" });
    }

    const teacherSessions = prisma.session.findMany({
      where: {
        teacherId: teacherId,

        startTime: {
          lt: new Date(data.endTime),
        },
        endTime: {
          gt: new Date(data.startTime),
        },
        status: {
          not: "CANCELLED",
        },
      },
    });

    if ((await teacherSessions).length > 0) {
      return res
        .status(400)
        .json({ error: "Teacher is already booked at this time" });
    }

    const studentSessions = prisma.session.findMany({
      where: {
        studentId: studentId,

        startTime: {
          lt: new Date(data.endTime),
        },
        endTime: {
          gt: new Date(data.startTime),
        },
        status: {
          not: "CANCELLED", // Optional: exclude cancelled sessions
        },
      },
    });

    if ((await studentSessions).length > 0) {
      return res
        .status(400)
        .json({ error: "You already have a session at this time" });
    }

    const newSession = await prisma.session.create({
      data: {
        teacherId,
        studentId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        status: "PENDING",
      },
    });

    res.status(201).json(newSession);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: "Something went wrong :(" });
  }
});

// GET session/student
router.get("/student", authenticateToken, async (req: any, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const studentId = student.id;

    const sessions = await prisma.session.findMany({
      where: { studentId: studentId },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
                subjects: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET session/teacher
router.get("/teacher", authenticateToken, async (req: any, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    const teacherId = teacher.id;

    const sessions = await prisma.session.findMany({
      where: { teacherId: teacherId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
                subjects: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });
    res.status(200).json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

export default router;
