import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { upload } from "../../config/multer";
import {
  uploadAvatar,
  deleteAvatar,
  uploadListingPhotos,
  deleteListingPhoto,
} from "../../controllers/upload.controller";

const router = Router();

/**
 * @swagger
 * /users/{id}/avatar:
 *   post:
 *     summary: Upload a profile picture
 *     tags: [Users]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 *       403:
 *         description: Can only update your own avatar
 */
router.post("/users/:id/avatar", authenticate, upload.single("image"), uploadAvatar);

/**
 * @swagger
 * /users/{id}/avatar:
 *   delete:
 *     summary: Remove profile picture
 *     tags: [Users]
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
 *         description: Avatar removed
 */
router.delete("/users/:id/avatar", authenticate, deleteAvatar);

/**
 * @swagger
 * /listings/{id}/photos:
 *   post:
 *     summary: Upload photos to a listing (max 5)
 *     tags: [Listings]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Photos uploaded
 *       403:
 *         description: Not your listing
 */
router.post("/listings/:id/photos", authenticate, upload.array("photos", 5), uploadListingPhotos);

/**
 * @swagger
 * /listings/{id}/photos/{photoId}:
 *   delete:
 *     summary: Delete a listing photo
 *     tags: [Listings]
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
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Photo deleted
 *       404:
 *         description: Photo not found
 */
router.delete("/listings/:id/photos/:photoId", authenticate, deleteListingPhoto);

export default router;
