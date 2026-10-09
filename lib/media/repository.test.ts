import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../db", () => ({ pool: { query } }));

import { MediaRepository } from "./repository";

describe("MediaRepository.create", () => {
  beforeEach(() => vi.clearAllMocks());

  const input = {
    userId: 42,
    cloudinaryPublicId: "users/42/video-abc",
    originalName: "video.mp4",
    fileName: "video.mp4",
    secureUrl: "https://res.cloudinary.com/example/video/upload/video-abc.mp4",
    format: "mp4",
    mimeType: "video/mp4",
    width: null,
    height: null,
    bytes: 1024,
    resourceType: "video" as const,
    folder: "users/42",
    tags: [] as string[],
    processingState: "ready" as const,
    uploadProtocol: "cloudinary_signed_direct" as const,
  };

  it("inserts the media row with a conflict-safe asset identity", async () => {
    const inserted = { id: 9, user_id: 42, cloudinary_public_id: input.cloudinaryPublicId };
    query.mockResolvedValueOnce({ rows: [inserted] });
    const repository = new MediaRepository();

    await expect(repository.create(input)).resolves.toEqual(inserted);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain(
      "ON CONFLICT (user_id, cloudinary_public_id) DO NOTHING",
    );
  });

  it("returns the winner's row when a concurrent insert already created the asset", async () => {
    const existing = { id: 9, user_id: 42, cloudinary_public_id: input.cloudinaryPublicId };
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [existing] });
    const repository = new MediaRepository();

    await expect(repository.create(input)).resolves.toEqual(existing);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][1]).toEqual([42, input.cloudinaryPublicId]);
  });

  it("fails closed if a conflict occurs but the existing row cannot be read", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    const repository = new MediaRepository();

    await expect(repository.create(input)).rejects.toThrow(
      "Media asset insert conflicted but the existing record could not be loaded.",
    );
  });
});
