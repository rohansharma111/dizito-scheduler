import type { MediaProcessingState, MediaUploadProtocol } from "./capabilities";

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
  durationSeconds?: number | null;
  posterUrl?: string | null;
  processingState?: MediaProcessingState;
  uploadProtocol?: MediaUploadProtocol;
  processingError?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UploadMediaInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  userId: number;
}

export interface CompleteDirectUploadInput {
  userId: number;
  publicId: string;
  fileName: string;
  mimeType: string;
  uploadProtocol?: MediaUploadProtocol;
  resource?: {
    secure_url?: string;
    public_id?: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
    resource_type?: string;
    folder?: string;
    duration?: number;
    context?: Record<string, unknown>;
  };
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
  durationSeconds?: number | null;
  posterUrl?: string | null;
  metadata?: Record<string, unknown>;
}
