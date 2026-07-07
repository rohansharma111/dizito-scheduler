import { PinterestBoard } from "./types";

export async function getBoards(
  accessToken: string,
): Promise<PinterestBoard[]> {
  const response = await fetch(
    "https://api.pinterest.com/v5/boards?page_size=100",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = "Failed to fetch Pinterest boards";

    try {
      const error = await response.json();

      message = error.message || error.error || JSON.stringify(error);
    } catch {}

    throw new Error(message);
  }

  const data = await response.json();

  const boards = Array.isArray(data.items) ? data.items : [];

  return boards.map(
    (board: any): PinterestBoard => ({
      id: board.id,

      name: board.name,

      description: board.description || undefined,

      privacy: board.privacy as "PUBLIC" | "PROTECTED" | "SECRET" | undefined,

      pinCount: board.pin_count,

      followerCount: board.follower_count,

      imageUrl:
        board.media?.image_cover_url ?? board.image_cover_url ?? undefined,
    }),
  );
}
