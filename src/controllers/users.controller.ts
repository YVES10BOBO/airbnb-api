import { Request, Response } from "express";
import prisma from "../db";

export async function getAllUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany();
  res.json(users);
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
}

export async function createUser(req: Request, res: Response): Promise<void> {
  if (!req.body) {
    res.status(400).json({ error: "Request body is missing. Set Content-Type: application/json" });
    return;
  }
  if (Array.isArray(req.body)) {
    res.status(400).json({ error: "Send a single user object, not an array" });
    return;
  }
  const { name, email, username, phone, role, avatar, bio } = req.body;
  if (!name || !email || !username || !phone || !role) {
    res.status(400).json({ error: "Missing required fields: name, email, username, phone, role" });
    return;
  }
  const user = await prisma.user.create({
    data: { name, email, username, phone, role, avatar, bio },
  });
  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const user = await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: "User deleted", user });
}
