export interface CreateMediaInput {
  userId: number;
  cloudinaryPublicId: string;
  originalName: string | null;
  fileName: string;
  secureUrl: string;
  format: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  bytes: number;
  resourceType: string;
  folder: string | null;
  tags: string[];
}

export interface UploadMediaInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  userId: number;
}

export interface UploadMediaResult {
  publicId: string;
  secureUrl: string;
  width: number | null;
  height: number | null;
  bytes: number;
  format: string;
  resourceType: string;
  folder: string;
}
