import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken, generateToken, getData } from "./helper";
import bcrypt from "bcryptjs";
import { ChangePwdSchema, ResetPwdSchema } from "../schemas/auth.schema";
import { LoginSchema, WithDrawSchema } from "../schemas/user.schema";

const router = Router();

// WHEN the user is logged in ( USER PREFERENCE )
// PATCH /user/change-password
router.patch("/change-password", authenticateToken, async (req: any, res) => {
  try {
    const data = getData(ChangePwdSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input ....!" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.status(400).json({ error: "Invalid access " });
    }

    const isMatch = await bcrypt.compare(data.oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const hashedNewPw = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPw,
      },
    });
    res.json({ msg: "Password changed successfully !" });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Something went wrong :(" });
  }
});

// POST /user/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const data = getData(ResetPwdSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input ....!" });

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      return res.status(400).json({ error: "Invalid email " });
    }

    const isMatch = user.verifyCode === data.verifyCode;
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid code" });
    }

    const hashedNewPw = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPw,
        verifyCode: 0,
      },
    });

    res.json({ msg: "Email verifide!" });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Something went wrong :(" });
  }
});

// POST /user/withdraw
router.post("/withdraw", authenticateToken, async (req: any, res) => {
  try {
    const data = getData(WithDrawSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input ....!" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.status(400).json({ error: "NO!" });
    }

    if (user.balance < data.amount || user.balance === 0) {
      return res
        .status(400)
        .json({ error: "you don't have that much money in your account !" });
    }

    const result = await prisma.$transaction(async (tx) => {
      var actualMoney;
      if (data.amount === 0) {
        actualMoney = user.balance;
      } else {
        actualMoney = data.amount;
      }
      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: user.balance - actualMoney,
        },
      });

      const receipt = await tx.receipt.create({
        data: {
          userId: user.id,
          amount: actualMoney,
        },
      });
      return receipt;
    });

    res.json({ result });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Something went wrong :(" });
  }
});

// POST /user/login
router.post("/login", async (req, res) => {
  try {
    const data = getData(LoginSchema, req);
    if (!data) return res.status(400).json({ error: "Invalid input" });

    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    if (user.role === "STUDENT") {
      if (user.status != "CONFIRMED") {
        return res.status(400).json({ error: "Validate email first" });
      }
    } else if (user.role === "TEACHER") {
      if (user.status != "APPROVED") {
        return res.status(400).json({ error: "Wait until Approved!" });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
