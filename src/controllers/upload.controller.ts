import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../config/prisma";
import { uploadToCloudinary, deleteFromCloudinary, getOptimizedUrl } from "../config/cloudinary";

export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (req.userId !== id) {
      res.status(403).json({ error: "You can only update your own avatar" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, "airbnb/avatars");
    const updated = await prisma.user.update({
      where: { id },
      data: { avatar: url, avatarPublicId: publicId },
    });
    const { password: _, ...safe } = updated as any;
    res.json(safe);
  } catch (error) {
    next(error);
  }
}

export async function deleteAvatar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (req.userId !== id) {
      res.status(403).json({ error: "You can only update your own avatar" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!user.avatar) {
      res.status(400).json({ error: "No avatar to remove" });
      return;
    }
    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }
    await prisma.user.update({
      where: { id },
      data: { avatar: null, avatarPublicId: null },
    });
    res.json({ message: "Avatar removed successfully" });
  } catch (error) {
    next(error);
  }
}

export async function uploadListingPhotos(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (listing.hostId !== req.userId) {
      res.status(403).json({ error: "You can only upload photos to your own listings" });
      return;
    }
    const existingCount = await prisma.listingPhoto.count({ where: { listingId: id } });
    if (existingCount >= 5) {
      res.status(400).json({ error: "Maximum of 5 photos allowed per listing" });
      return;
    }
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }
    const remaining = 5 - existingCount;
    const toUpload = files.slice(0, remaining);
    for (const file of toUpload) {
      const { url, publicId } = await uploadToCloudinary(file.buffer, "airbnb/listings");
      await prisma.listingPhoto.create({ data: { url, publicId, listingId: id } });
    }
    const updated = await prisma.listing.findUnique({
      where: { id },
      include: {
        photos: true,
        host: { select: { id: true, name: true, avatar: true } },
      },
    });
    res.json({
      ...updated,
      photos: updated!.photos.map((p) => ({
        ...p,
        url: getOptimizedUrl(p.url, 800, 600),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteListingPhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const photoId = Number(req.params.photoId);
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (listing.hostId !== req.userId) {
      res.status(403).json({ error: "You can only delete photos from your own listings" });
      return;
    }
    const photo = await prisma.listingPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    if (photo.listingId !== id) {
      res.status(403).json({ error: "Photo does not belong to this listing" });
      return;
    }
    await deleteFromCloudinary(photo.publicId);
    await prisma.listingPhoto.delete({ where: { id: photoId } });
    res.json({ message: "Photo deleted successfully" });
  } catch (error) {
    next(error);
  }
}
