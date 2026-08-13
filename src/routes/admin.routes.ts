import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken, getData, sendEmail } from "./helper";
import { LoginSchema } from "../schemas/user.schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AdminUpdateReport, AdminUpdateStatus } from "../schemas/admin.schema";

const router = Router();

// PATCH admin/user/:id/status
router.patch("/user/:id/status", authenticateToken, async (req: any, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.id, role: "ADMIN" },
    });

    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ error: "user not found" });
    }

    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      return res.status(404).json({ error: "there's no userr with this id!" });
    }

    const data = getData(AdminUpdateStatus, req);
    if (!data) {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (data.status === "APPROVED" && user.role === "TEACHER") {
      sendEmail(
        "noreply@resend.dev",
        "osamareema59@gmail.com",
        "You are acceepted! in fluenzy platform.",
        `<p>thank you so much for registiring in our platform ! </p>
        <p>you can now sign up in your account !</p>`,
      );
    }

    const userStatus = await prisma.user.update({
      where: { id: id },
      data: { status: data.status },
    });

    res.json(userStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});


// GET /admin/teacher/confirmed?page=1&limit=10
router.get("/teachers/confirmed", authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const teachers = await prisma.teacher.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: {
        user: {
          status: "CONFIRMED",
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            subjects: true,
            profileImageUrl: true,
            status: true,
          },
        },
      },
    });

    const total = await prisma.teacher.count({
      where: {
        user: {
          status: "CONFIRMED",
        },
      },
    });

    res.json({
      teachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// GET /admin/dashboard
router.get("/dashboard", authenticateToken, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.role != "ADMIN") {
      // I was wanting to put like forbiddin access you piece of shit! but what if I accidently test it wrong :)
      return res
        .status(403)
        .json({ error: "Sorry accessing this route is forbiden :)" });
    }
    // wtf is this one !?
    const totalMoney = await prisma.transaction.aggregate({
      where: { status: "RELEASED" },
      _sum: { scheduledAmount: true, teacherEarn: true },
    });
    const totalPendingSessions = await prisma.session.count({
      where: { status: "PENDING" },
    });
    const totalSessions = await prisma.session.count();
    const totalActiveTeachers = await prisma.teacher.count({
      where: { user: { status: "APPROVED" } },
    });

    const revenue = totalMoney._sum.scheduledAmount || 0;
    const teacherEarnings = totalMoney._sum.teacherEarn || 0;
    const platformFees = revenue * 0.2;

    res.json({
      totalRevenue: revenue,
      totalPlatformFees: platformFees,
      totalTeacherEarnings: teacherEarnings,
      totalSessions: totalSessions,
      pendingSessions: totalPendingSessions,
      activeTeachers: totalActiveTeachers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to get dashboard data" });
  }
});

// GET /admin/reports?page=1&limit=10
router.get("/reports", authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.role != "ADMIN") {
      return res
        .status(403)
        .json({ error: "Sorry accessing this route is forbiden :)" });
    }

    const reports = await prisma.report.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: { status: "PENDING" },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        reported: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        message: true,
      },
    });
    res.json(reports);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to get dashboard data" });
  }
});

// GET /admin/report/messages_history/:id?page=1&limit=10
router.get(
  "/reports/:id/messages",
  authenticateToken,
  async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user || user.role != "ADMIN") {
        return res
          .status(403)
          .json({ error: "Sorry accessing this route is forbiden :)" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const id = req.params.id;

      const existingReport = await prisma.report.findUnique({
        where: { id: id },
      });
      if (!existingReport) {
        return res.status(403).json({ error: "wrong data passed" });
      }

      const reporter = await prisma.user.findUnique({
        where: { id: existingReport.reporterId },
      });

      if (!reporter) {
        return res.status(403).json({ error: "no user found :(" });
      }

      const reported = await prisma.user.findUnique({
        where: { id: existingReport.reportedId },
      });

      if (!reported) {
        return res.status(403).json({ error: "no user found :(" });
      }

      const messages = await prisma.message.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          OR: [
            {
              senderId: reporter.id,
              reciverId: reported.id,
            },
            {
              senderId: reported.id,
              reciverId: reporter.id,
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
      res.status(500).json({ error: "Failed to get dashboard data" });
    }
  },
);

// PATCH admin/reports/:id
router.patch("/report/:id", authenticateToken, async (req: any, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.id, role: "ADMIN" },
    });

    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ error: "user not found" });
    }

    const id = req.params.id;
    // TODO: check if the report in the DB

    const report = await prisma.report.findUnique({
      where: { id: id },
    });

    if (!report) {
      return res.status(404).json({ error: "there's no report with this id!" });
    }

    const data = getData(AdminUpdateReport, req);
    if (!data) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const updatedReport = await prisma.report.update({
      where: { id: id },
      data: {
        status: data.status,
        resolvedAt: new Date(),
        resolvedById: req.user.id,
      },
    });
    res.json(updatedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

export default router;
