import { Router } from "express";
import { getListingReviews, createReview, deleteReview } from "../../controllers/reviews.controller";
import { authenticate, requireGuest } from "../../middlewares/auth.middleware";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /listings/{id}/reviews:
 *   get:
 *     summary: Get all reviews for a listing
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     responses:
 *       200:
 *         description: Paginated list of reviews
 *       404:
 *         description: Listing not found
 */
router.get("/", getListingReviews);

/**
 * @swagger
 * /listings/{id}/reviews:
 *   post:
 *     summary: Create a review for a listing
 *     description: Only GUEST users with a confirmed booking for this listing can leave a review.
 *     tags: [Reviews]
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
 *             required: [rating, comment]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Amazing place, loved the view!
 *     responses:
 *       201:
 *         description: Review created
 *       403:
 *         description: No confirmed booking for this listing
 *       404:
 *         description: Listing not found
 */
router.post("/", authenticate, requireGuest, createReview);

/**
 * @swagger
 * /listings/{id}/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     description: Only the review author or an ADMIN can delete a review.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Review deleted
 *       403:
 *         description: Not your review
 *       404:
 *         description: Review not found
 */
router.delete("/:reviewId", authenticate, deleteReview);

export default router;
