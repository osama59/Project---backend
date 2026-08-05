import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken, getData } from "./helper";
import { LoginSchema } from "../schemas/user.schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AdminUpdateStatus } from "../schemas/admin.schema";

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

    const userStatus = await prisma.user.update({
      where: { id: id },
      data: { status: data.status },
    });

    res.json(userStatus.status);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// POST /admin/login
router.post("/login", async (req, res) => {
  const data = getData(LoginSchema, req);
  if (!data) return res.status(400).json({ error: "Invalid input" });

  const { email, password } = data;

  try {
    const user = await prisma.user.findUnique({
      where: { email, role: "ADMIN" },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
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

export default router;
