import { Request, Response } from "express";
import prisma from "../db";

export async function getAllListings(_req: Request, res: Response): Promise<void> {
  const listings = await prisma.listing.findMany();
  res.json(listings);
}

export async function getListingById(req: Request, res: Response): Promise<void> {
  const listing = await prisma.listing.findUnique({ where: { id: Number(req.params.id) } });
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json(listing);
}

export async function createListing(req: Request, res: Response): Promise<void> {
  if (!req.body) {
    res.status(400).json({ error: "Request body is missing. Set Content-Type: application/json" });
    return;
  }
  if (Array.isArray(req.body)) {
    res.status(400).json({ error: "Send a single listing object, not an array" });
    return;
  }
  const { title, description, location, pricePerNight, guests, type, amenities, rating, host } = req.body;
  if (!title || !description || !location || !pricePerNight || !guests || !type || !amenities || !host) {
    res.status(400).json({
      error: "Missing required fields: title, description, location, pricePerNight, guests, type, amenities, host",
    });
    return;
  }
  if (typeof guests !== "number" || guests < 1) {
    res.status(400).json({ error: "guests must be a number greater than 0" });
    return;
  }
  if (typeof pricePerNight !== "number" || pricePerNight < 1) {
    res.status(400).json({ error: "pricePerNight must be a number greater than 0" });
    return;
  }
  if (rating !== undefined && (rating < 0 || rating > 5)) {
    res.status(400).json({ error: "rating must be between 0 and 5" });
    return;
  }
  const listing = await prisma.listing.create({
    data: { title, description, location, pricePerNight, guests, type, amenities, rating, host },
  });
  res.status(201).json(listing);
}

export async function updateListing(req: Request, res: Response): Promise<void> {
  const existing = await prisma.listing.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  const { guests, pricePerNight, rating } = req.body;
  if (guests !== undefined && (typeof guests !== "number" || guests < 1)) {
    res.status(400).json({ error: "guests must be a number greater than 0" });
    return;
  }
  if (pricePerNight !== undefined && (typeof pricePerNight !== "number" || pricePerNight < 1)) {
    res.status(400).json({ error: "pricePerNight must be a number greater than 0" });
    return;
  }
  if (rating !== undefined && (rating < 0 || rating > 5)) {
    res.status(400).json({ error: "rating must be between 0 and 5" });
    return;
  }
  const listing = await prisma.listing.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(listing);
}

export async function deleteListing(req: Request, res: Response): Promise<void> {
  const existing = await prisma.listing.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  const listing = await prisma.listing.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: "Listing deleted", listing });
}
