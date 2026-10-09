import { pool } from "../db";
import { CreateMediaInput } from "./types";

export class MediaRepository {
  async create(data: CreateMediaInput) {
    console.log("F. Repository create() called");

    const result = await pool.query(
      `
      INSERT INTO media_library (
        user_id,
        cloudinary_public_id,
        original_name,
        file_name,
        secure_url,
        format,
        mime_type,
        width,
        height,
        bytes,
        resource_type,
        folder,
        tags,
        media_type,
        duration_seconds,
        poster_url,
        processing_state,
        upload_protocol,
        processing_error,
        metadata
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
      RETURNING *
      `,
      [
        data.userId,
        data.cloudinaryPublicId,
        data.originalName,
        data.fileName,
        data.secureUrl,
        data.format,
        data.mimeType,
        data.width,
        data.height,
        data.bytes,
        data.resourceType,
        data.folder,
        data.tags,
        data.resourceType === "video" ? "video" : "image",
        data.durationSeconds ?? null,
        data.posterUrl ?? null,
        data.processingState ?? "ready",
        data.uploadProtocol ?? "server_proxy",
        data.processingError ?? null,
        data.metadata ?? {},
      ],
    );

     console.log("G. Query finished");
  console.log(result.rows[0]);

    return result.rows[0];
  }

  async findByCloudinaryPublicId(userId: number, publicId: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM media_library
      WHERE user_id = $1
        AND cloudinary_public_id = $2
      LIMIT 1
      `,
      [userId, publicId],
    );

    return result.rows[0] ?? null;
  }

  async findById(id: number, userId: number) {
    const result = await pool.query(
      `
      SELECT *
      FROM media_library
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      `,
      [id, userId],
    );

    return result.rows[0] ?? null;
  }

  async listByUser(userId: number) {
    const result = await pool.query(
      `
      SELECT *
      FROM media_library
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows;
  }

  async softDelete(id: number, userId: number) {
    const result = await pool.query(
      `
      UPDATE media_library
      SET deleted_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING *
      `,
      [id, userId],
    );

    return result.rows[0] ?? null;
  }

  async getStorageUsed(userId: number) {
    const result = await pool.query(
      `
      SELECT COALESCE(SUM(bytes), 0) AS total
      FROM media_library
      WHERE user_id = $1
        AND deleted_at IS NULL
      `,
      [userId],
    );

    return Number(result.rows[0].total);
  }
}

export const mediaRepository = new MediaRepository();
