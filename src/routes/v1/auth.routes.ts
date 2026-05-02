import { Router } from "express";
import {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../../controllers/auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: a3f8c2d1-4b5e-4f6a-8c9d-1e2f3a4b5c6d
 *         name:
 *           type: string
 *           example: Alice Moreau
 *         email:
 *           type: string
 *           example: alice@example.com
 *         username:
 *           type: string
 *           example: alicemoreau
 *         phone:
 *           type: string
 *           example: "+1-555-0101"
 *         role:
 *           type: string
 *           enum: [ADMIN, HOST, GUEST]
 *           example: HOST
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: https://res.cloudinary.com/demo/image/upload/sample.jpg
 *         bio:
 *           type: string
 *           nullable: true
 *           example: Passionate host who loves sharing beautiful spaces.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-27T10:00:00Z"
 *
 *     Listing:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e
 *         title:
 *           type: string
 *           example: Cozy Downtown Apartment
 *         description:
 *           type: string
 *           example: A bright studio in the heart of the city.
 *         location:
 *           type: string
 *           example: New York, NY
 *         pricePerNight:
 *           type: number
 *           example: 120
 *         guests:
 *           type: integer
 *           example: 2
 *         type:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *           example: APARTMENT
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Kitchen, Washer]
 *         rating:
 *           type: number
 *           nullable: true
 *           example: 4.8
 *         hostId:
 *           type: string
 *           format: uuid
 *           example: a3f8c2d1-4b5e-4f6a-8c9d-1e2f3a4b5c6d
 *         host:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-27T10:00:00Z"
 *
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: "2026-08-01T00:00:00Z"
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: "2026-08-05T00:00:00Z"
 *         guests:
 *           type: integer
 *           example: 2
 *         totalPrice:
 *           type: number
 *           example: 480
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED]
 *           example: CONFIRMED
 *         guestId:
 *           type: string
 *           format: uuid
 *           example: a3f8c2d1-4b5e-4f6a-8c9d-1e2f3a4b5c6d
 *         listingId:
 *           type: string
 *           format: uuid
 *           example: b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e
 *         guest:
 *           $ref: '#/components/schemas/User'
 *         listing:
 *           $ref: '#/components/schemas/Listing'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-27T10:00:00Z"
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Resource not found
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 *     RegisterInput:
 *       type: object
 *       required: [name, email, username, phone, password]
 *       properties:
 *         name:
 *           type: string
 *           example: Alice Moreau
 *         email:
 *           type: string
 *           example: alice@example.com
 *         username:
 *           type: string
 *           example: alicemoreau
 *         phone:
 *           type: string
 *           example: "+1-555-0101"
 *         password:
 *           type: string
 *           example: password123
 *         role:
 *           type: string
 *           enum: [HOST, GUEST]
 *           example: HOST
 *
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           example: alice@example.com
 *         password:
 *           type: string
 *           example: password123
 *
 *     CreateListingInput:
 *       type: object
 *       required: [title, description, location, pricePerNight, guests, type, amenities]
 *       properties:
 *         title:
 *           type: string
 *           example: Cozy Downtown Apartment
 *         description:
 *           type: string
 *           example: A bright studio in the heart of the city.
 *         location:
 *           type: string
 *           example: New York, NY
 *         pricePerNight:
 *           type: number
 *           example: 120
 *         guests:
 *           type: integer
 *           example: 2
 *         type:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *           example: APARTMENT
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Kitchen]
 *
 *     CreateBookingInput:
 *       type: object
 *       required: [listingId, checkIn, checkOut, guests]
 *       properties:
 *         listingId:
 *           type: string
 *           format: uuid
 *           example: b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: "2026-11-01T00:00:00Z"
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: "2026-11-05T00:00:00Z"
 *         guests:
 *           type: integer
 *           example: 2
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and sends a welcome email.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: User created — id is a UUID string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email or username already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", authenticate, getMe);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password for logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 example: newpassword456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password incorrect or no token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/change-password", authenticate, changePassword);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: alice@example.com
 *     responses:
 *       200:
 *         description: Reset email sent if account exists
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password using token from email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 example: mynewpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/reset-password/:token", resetPassword);

export default router;
