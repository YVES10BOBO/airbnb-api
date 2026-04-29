import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { createUserSchema, updateUserSchema } from "../validators/users.validator";
import { profileSchema } from "../validators/profile.validator";

export async function getAllUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, username: true, phone: true, role: true, avatar: true, bio: true, updatedAt: true },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    let data;
    if (user.role === "HOST") {
      data = await prisma.user.findUnique({
        where: { id: user.id },
        include: { listings: { include: { _count: { select: { bookings: true } } } } },
      });
    } else if (user.role === "GUEST") {
      data = await prisma.user.findUnique({
        where: { id: user.id },
        include: { bookings: { include: { listing: { select: { title: true, location: true } } } } },
      });
    } else {
      data = user;
    }
    const { password: _, ...safe } = data as typeof user & { password: string };
    res.json(safe);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    const user = await prisma.user.create({ data: result.data as any });
    const { password: _, ...safe } = user as any;
    res.status(201).json(safe);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: result.data as any,
    });
    const { password: _, ...safe } = user as any;
    res.json(safe);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
}

export async function getUserListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const listings = await prisma.listing.findMany({
      where: { hostId: Number(req.params.id) },
      include: { _count: { select: { bookings: true } } },
    });
    res.json(listings);
  } catch (error) {
    next(error);
  }
}

export async function getUserBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const bookings = await prisma.booking.findMany({
      where: { guestId: Number(req.params.id) },
      include: {
        listing: { select: { id: true, title: true, location: true, pricePerNight: true } },
      },
    });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

// Profile endpoints
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: Number(req.params.id) } });
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const existing = await prisma.profile.findUnique({ where: { userId: Number(req.params.id) } });
    if (existing) {
      res.status(409).json({ error: "Profile already exists for this user" });
      return;
    }
    const result = profileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    const profile = await prisma.profile.create({
      data: { ...result.data, userId: Number(req.params.id) },
    });
    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const existing = await prisma.profile.findUnique({ where: { userId: Number(req.params.id) } });
    if (!existing) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const result = profileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    const profile = await prisma.profile.update({
      where: { userId: Number(req.params.id) },
      data: result.data,
    });
    res.json(profile);
  } catch (error) {
    next(error);
  }
}
