import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createBookingSchema } from "../validators/bookings.validator";
import { sendEmail } from "../config/email";
import { bookingConfirmationEmail, bookingCancellationEmail } from "../templates/emails";

export async function getAllBookings(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        listing: { select: { id: true, title: true, location: true } },
        guest: { select: { id: true, name: true, username: true } },
      },
    });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        listing: { include: { host: { select: { id: true, name: true } } } },
        guest: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function createBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    const { listingId, checkIn, checkOut, guests } = result.data;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        listingId,
        status: "CONFIRMED",
        AND: [{ checkIn: { lt: checkOutDate } }, { checkOut: { gt: checkInDate } }],
      },
    });
    if (conflict) {
      res.status(409).json({ error: "Listing is already booked for those dates" });
      return;
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * listing.pricePerNight;

    const booking = await prisma.booking.create({
      data: {
        guestId: req.userId!,
        listingId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        totalPrice,
        status: "PENDING",
      },
    });

    try {
      const guest = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (guest) {
        await sendEmail(
          guest.email,
          "Booking Confirmed!",
          bookingConfirmationEmail(
            guest.name,
            listing.title,
            listing.location,
            checkInDate.toDateString(),
            checkOutDate.toDateString(),
            totalPrice
          )
        );
      }
    } catch (emailErr) {
      console.error("Booking confirmation email failed:", emailErr);
    }

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    if (booking.guestId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only cancel your own bookings" });
      return;
    }
    if (booking.status === "CANCELLED") {
      res.status(400).json({ error: "Booking is already cancelled" });
      return;
    }
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });

    try {
      const guest = await prisma.user.findUnique({ where: { id: booking.guestId } });
      const listingData = await prisma.listing.findUnique({ where: { id: booking.listingId } });
      if (guest && listingData) {
        await sendEmail(
          guest.email,
          "Booking Cancelled",
          bookingCancellationEmail(
            guest.name,
            listingData.title,
            booking.checkIn.toDateString(),
            booking.checkOut.toDateString()
          )
        );
      }
    } catch (emailErr) {
      console.error("Booking cancellation email failed:", emailErr);
    }

    res.json({ message: "Booking cancelled", booking: updated });
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body;
    const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: "status must be one of: PENDING, CONFIRMED, CANCELLED" });
      return;
    }
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}
