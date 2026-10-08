export interface MediaItem {
  id: number;
  user_id: number;

  cloudinary_public_id: string;
  secure_url: string;

  file_name: string;
  mime_type: string;

  format: string;
  resource_type: "image" | "video" | "raw";

  width: number | null;
  height: number | null;

  bytes: number;
  media_type?: "image" | "video";
  duration_seconds?: number | null;
  poster_url?: string | null;
  processing_state?: "pending" | "uploading" | "processing" | "ready" | "failed";
  upload_protocol?: "server_proxy" | "cloudinary_signed_direct";
  processing_error?: string | null;
  metadata?: Record<string, unknown> | null;

  folder: string | null;
  tags: string[] | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
