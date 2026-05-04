import { Router } from "express";
import {
  aiSearch,
  generateDescription,
  aiChat,
  aiRecommend,
  reviewSummary,
} from "../../controllers/ai.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /ai/search:
 *   post:
 *     summary: Smart listing search using natural language
 *     description: Extracts filters from a natural language query and returns paginated listings.
 *     tags: [AI]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: apartment in Kigali under $100 for 2 guests
 *     responses:
 *       200:
 *         description: Paginated listings matching extracted filters
 *       400:
 *         description: Could not extract filters or query too vague
 */
router.post("/search", aiSearch);

/**
 * @swagger
 * /ai/listings/{id}/generate-description:
 *   post:
 *     summary: Generate an AI listing description
 *     description: Generates and saves an AI-written description for the listing. Host only.
 *     tags: [AI]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, luxury]
 *                 default: professional
 *     responses:
 *       200:
 *         description: Generated description and updated listing
 *       403:
 *         description: Not your listing
 *       404:
 *         description: Listing not found
 */
router.post("/listings/:id/generate-description", authenticate, generateDescription);

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     summary: Guest support chatbot
 *     description: Answers guest questions, optionally with context from a specific listing.
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, message]
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: user-123-session-1
 *               message:
 *                 type: string
 *                 example: Does this place have WiFi?
 *               listingId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: AI response with session info
 *       400:
 *         description: Missing sessionId or message
 */
router.post("/chat", aiChat);

/**
 * @swagger
 * /ai/recommend:
 *   post:
 *     summary: Get AI-powered listing recommendations
 *     description: Analyzes your booking history and recommends similar listings.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations based on booking history
 *       400:
 *         description: No booking history found
 */
router.post("/recommend", authenticate, aiRecommend);

/**
 * @swagger
 * /ai/listings/{id}/review-summary:
 *   get:
 *     summary: Get AI-generated review summary for a listing
 *     description: Summarizes all guest reviews into structured insights. Cached for 10 minutes.
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: AI-generated review summary
 *       400:
 *         description: Not enough reviews (minimum 3)
 *       404:
 *         description: Listing not found
 */
router.get("/listings/:id/review-summary", reviewSummary);

export default router;
