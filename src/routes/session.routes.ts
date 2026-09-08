import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken, getData } from "./helper";
import {
  SessionRateSchema,
  SessionSchema,
  SessionUpdateSchema,
} from "../schemas/session.schema";
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

    const result = await prisma.$transaction(async (tx) => {
      const newSession = await tx.session.create({
        data: {
          teacherId,
          studentId,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          status: "PENDING",
        },
      });

      const sessionDuration =
        Math.abs(
          newSession.endTime.getTime() - newSession.startTime.getTime(),
        ) /
        (1000 * 60);

      const scheduledAmount = sessionDuration * (teacher.hourPrice / 60); // is this correct !?

      const newTransaction = await tx.transaction.create({
        data: {
          sessionId: newSession.id,
          studentId: studentId,
          teacherId: teacherId,
          scheduledAmount: scheduledAmount,
          platformFee: 0.2, // This needs to be come from somewhere , I don't know where :) , but NOT hard coded like that
        },
      });

      return { newSession, newTransaction };
    });

    res.status(201).json(result);
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

// PATCH  /session/:id
router.patch("/:id", authenticateToken, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: "user profile not found" });
    }

    const { id } = req.params;

    const existingSession = await prisma.session.findUnique({
      where: { id: id },
    });

    if (!existingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    const data = getData(SessionUpdateSchema, req);
    if (!data) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // Get the teacher record for this user (if they are a teacher)
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
    });

    // Get the student record for this user (if they are a student)
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
    });

    if (user.role === "TEACHER") {
      if (!teacher || existingSession.teacherId !== teacher.id) {
        return res
          .status(403)
          .json({ error: "You are not the teacher for this session" });
      }
    }
    if (user.role === "STUDENT") {
      if (!student || existingSession.studentId !== student.id) {
        return res
          .status(403)
          .json({ error: "You are not the student for this session" });
      }
    }

    const sessionTransaction = await prisma.transaction.findUnique({
      where: { sessionId: id },
    });
    if (!sessionTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const sessionTeacher = await prisma.teacher.findUnique({
      where: { id: existingSession.teacherId },
    });

    const sessionStudent = await prisma.student.findUnique({
      where: { id: existingSession.studentId },
    });

    const teacherUser = await prisma.user.findUnique({
      where: { id: sessionTeacher?.userId },
    });
    if (!teacherUser) {
      return res.status(404).json({ error: "user profile not found" });
    }

    const studentUser = await prisma.user.findUnique({
      where: { id: sessionStudent?.userId },
    });
    if (!studentUser) {
      return res.status(404).json({ error: "user profile not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.session.update({
        where: { id: id },
        data: { status: data.status },
      });

      //TRANSITION SECTION
      if (data.status == "COMPLETED") {
        const scheduledDuration =
          Math.abs(
            existingSession.endTime.getTime() -
              existingSession.startTime.getTime(),
          ) /
          (1000 * 60);
        const realEndTime = new Date(data.realEndTime);
        const realStartTime = new Date(data.realStartTime);
        const activeDuration =
          (realEndTime.getTime() - realStartTime.getTime()) / (1000 * 60);

        const percentage = Math.min(activeDuration / scheduledDuration, 1);
        const actualAmount = sessionTransaction.scheduledAmount * percentage;
        const platformFee = sessionTransaction.platformFee;
        const updatedTransaction = await tx.transaction.update({
          where: { sessionId: id },
          data: {
            actualAmount: actualAmount,
            teacherEarn: actualAmount * (1 - platformFee),
            status: "RELEASED",
          },
        });
        const teacherEarn = updatedTransaction.teacherEarn ?? 0;
        const teacherBalance = teacherUser?.balance ?? 0;
        await tx.user.update({
          where: { id: teacherUser.id },
          data: { balance: teacherBalance + teacherEarn },
        });
        return { updatedTransaction, updatedSession };
      }

      // REFUND SECTION
      else if (data.status == "CANCELLED") {
        const updatedTransaction = await tx.transaction.update({
          where: { sessionId: id },
          data: {
            status: "REFUNDED",
          },
        });

        const studentBalance = studentUser?.balance ?? 0;

        await tx.user.update({
          where: { id: studentUser.id },
          data: {
            balance: studentBalance + updatedTransaction.scheduledAmount,
          },
        });
        return { updatedTransaction, updatedSession };
      }
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update session" });
  }
});

//POST /session/:id/rate // this one the STUDENT uses it
router.post("/:id/rate", authenticateToken, async (req: any, res) => {
  //Body: { rating: 5, review: "Great teacher!" }
  try {
    const data = getData(SessionRateSchema, req);
    if (!data) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const { id } = req.params;

    const existingSession = await prisma.session.findUnique({
      where: { id: id, studentId: student.id },
    });

    if (!existingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (existingSession.status != "COMPLETED") {
      return res.status(400).json({ error: "Session didn't complete yet!" });
    }

    const existingRate = await prisma.rating.findUnique({
      where: { sessionId: id },
    });
    if (existingRate) {
      return res
        .status(400)
        .json({ error: "this Session already been rated !" });
    }

    const newRating = await prisma.rating.create({
      data: {
        studentId: student.id,
        teacherId: existingSession.teacherId,
        sessionId: existingSession.id,
        rating: data.rating,
        review: data.review,
      },
    });

    res.status(201).json(newRating);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create rating" });
  }
});



export default router;
