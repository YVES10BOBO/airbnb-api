import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendEmail } from "../config/email";
import { welcomeEmail, passwordResetEmail } from "../templates/emails";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as string;

function omitPassword<T extends { password: string }>(user: T): Omit<T, "password"> {
  const { password: _, ...rest } = user;
  return rest;
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, username, password, phone, role, avatar, bio } = req.body;

  if (!name || !email || !username || !password || !phone) {
    res.status(400).json({ error: "Missing required fields: name, email, username, password, phone" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (role && role === "ADMIN") {
    res.status(400).json({ error: "Cannot register as ADMIN" });
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    res.status(409).json({ error: "Email or username is already taken" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      phone,
      password: hashedPassword,
      role: role ?? "GUEST",
      avatar,
      bio,
    },
  });

  try {
    await sendEmail(user.email, "Welcome to Airbnb!", welcomeEmail(user.name, user.role));
  } catch (emailErr) {
    console.error("Welcome email failed:", emailErr);
  }

  res.status(201).json(omitPassword(user));
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Missing required fields: email, password" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  res.json({ token, user: omitPassword(user) });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include:
      req.role === "HOST"
        ? { listings: true }
        : req.role === "GUEST"
        ? { bookings: { include: { listing: true } } }
        : undefined,
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(omitPassword(user));
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Missing required fields: currentPassword, newPassword" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });

  res.json({ message: "Password changed successfully" });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  const SAFE_RESPONSE = { message: "If that email is registered, a reset link has been sent" };

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.json(SAFE_RESPONSE);
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: hashedToken, resetTokenExpiry: expiry },
  });

  const resetLink = `${process.env["API_URL"] ?? "http://localhost:3000"}/auth/reset-password/${rawToken}`;

  try {
    await sendEmail(user.email, "Reset your password", passwordResetEmail(user.name, resetLink));
  } catch (emailErr) {
    console.error("Password reset email failed:", emailErr);
  }

  res.json(SAFE_RESPONSE);
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const rawToken = req.params["token"] as string;
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: "New password is required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetToken: null, resetTokenExpiry: null },
  });

  res.json({ message: "Password has been reset successfully" });
}
