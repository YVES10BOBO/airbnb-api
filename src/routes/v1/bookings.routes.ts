import { Router } from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  cancelBooking,
  updateBookingStatus,
} from "../../controllers/bookings.controller";
import { authenticate, requireGuest, requireAdmin } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, getAllBookings);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get a booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 */
router.get("/:id", authenticate, getBookingById);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     description: Only GUEST users can create bookings. listingId must be a UUID.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingInput'
 *     responses:
 *       201:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       409:
 *         description: Listing already booked for those dates
 */
router.post("/", authenticate, requireGuest, createBooking);

/**
 * @swagger
 * /bookings/{id}/status:
 *   patch:
 *     summary: Update booking status (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, CANCELLED]
 *                 example: CONFIRMED
 *     responses:
 *       200:
 *         description: Booking status updated
 *       403:
 *         description: Admin access required
 */
router.patch("/:id/status", authenticate, requireAdmin, updateBookingStatus);

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Cancel a booking
 *     description: Guests can cancel their own bookings. Admins can cancel any.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       403:
 *         description: Can only cancel your own bookings
 */
router.delete("/:id", authenticate, cancelBooking);

export default router;
