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

  folder: string | null;
  tags: string[] | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
