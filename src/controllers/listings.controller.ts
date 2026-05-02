import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createListingSchema, updateListingSchema } from "../validators/listings.validator";
import { Prisma } from "../generated/prisma/client";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

export async function getAllListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { location, type, maxPrice, page, limit, sortBy, order } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `listings:all:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const where: Prisma.ListingWhereInput = {};
    if (location) where.location = { contains: location as string, mode: "insensitive" };
    if (type) where.type = type as any;
    if (maxPrice) where.pricePerNight = { lte: Number(maxPrice) };

    const orderBy: Prisma.ListingOrderByWithRelationInput = {};
    if (sortBy === "pricePerNight") orderBy.pricePerNight = (order === "desc" ? "desc" : "asc");
    else orderBy.createdAt = "desc";

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          host: { select: { id: true, name: true, avatar: true } },
          _count: { select: { bookings: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const result = {
      data: listings,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };

    setCache(cacheKey, result, 60);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function searchListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, location, type, minPrice, maxPrice, guests, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `listings:search:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const where: Prisma.ListingWhereInput = {};
    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: "insensitive" } },
        { description: { contains: q as string, mode: "insensitive" } },
      ];
    }
    if (location) where.location = { contains: location as string, mode: "insensitive" };
    if (type) where.type = type as any;
    if (minPrice || maxPrice) {
      where.pricePerNight = {};
      if (minPrice) (where.pricePerNight as any).gte = Number(minPrice);
      if (maxPrice) (where.pricePerNight as any).lte = Number(maxPrice);
    }
    if (guests) where.guests = { gte: Number(guests) };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          host: { select: { id: true, name: true, avatar: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.listing.count({ where }),
    ]);

    const result = {
      data: listings,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };

    setCache(cacheKey, result, 60);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getListingById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        host: true,
        bookings: {
          include: {
            guest: { select: { id: true, name: true, avatar: true } },
          },
        },
        photos: true,
      },
    });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(listing);
  } catch (error) {
    next(error);
  }
}

export async function createListing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createListingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    const listing = await prisma.listing.create({
      data: { ...result.data, hostId: req.userId! },
    });
    deleteCacheByPrefix("listings:");
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
}

export async function updateListing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only edit your own listings" });
      return;
    }
    const result = updateListingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    const updated = await prisma.listing.update({
      where: { id: req.params.id },
      data: result.data,
    });
    deleteCacheByPrefix("listings:");
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteListing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own listings" });
      return;
    }
    await prisma.listing.delete({ where: { id: req.params.id } });
    deleteCacheByPrefix("listings:");
    res.json({ message: "Listing deleted" });
  } catch (error) {
    next(error);
  }
}
