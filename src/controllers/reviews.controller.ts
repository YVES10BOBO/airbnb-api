import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

export async function getListingReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listingId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const cacheKey = `reviews:listing:${listingId}:${page}:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { listingId },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.count({ where: { listingId } }),
    ]);

    const result = {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const listingId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      res.status(400).json({ error: "Rating and comment are required" });
      return;
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be a number between 1 and 5" });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const hasBooking = await prisma.booking.findFirst({
      where: { listingId, guestId: req.userId!, status: "CONFIRMED" },
    });
    if (!hasBooking) {
      res.status(403).json({ error: "You can only review listings you have a confirmed booking for" });
      return;
    }

    const review = await prisma.review.create({
      data: { rating, comment, userId: req.userId!, listingId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    deleteCacheByPrefix(`reviews:listing:${listingId}`);
    deleteCacheByPrefix(`stats:listing:${listingId}`);

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.reviewId } });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    if (review.userId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own reviews" });
      return;
    }
    await prisma.review.delete({ where: { id: review.id } });

    deleteCacheByPrefix(`reviews:listing:${review.listingId}`);
    deleteCacheByPrefix(`stats:listing:${review.listingId}`);

    res.json({ message: "Review deleted" });
  } catch (error) {
    next(error);
  }
}
