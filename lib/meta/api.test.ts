import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverMetaPages } from "./api";

describe("discoverMetaPages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses /me/accounts when Pages are returned there", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "page-1",
                name: "Direct Page",
                access_token: "page-token-1",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await discoverMetaPages("test-user-token");

    expect(result.source).toBe("accounts");
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].id).toBe("page-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/me/accounts");
  });

  it("falls back to /me/assigned_pages when /me/accounts is empty", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "page-2",
                name: "Business Portfolio Page",
                access_token: "page-token-2",
                tasks: ["CREATE_CONTENT", "MANAGE"],
              },
            ],
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await discoverMetaPages("test-business-token");

    expect(result.source).toBe("assigned_pages");
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].id).toBe("page-2");
    expect(result.pages[0].tasks).toContain("CREATE_CONTENT");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("/me/assigned_pages");
  });

  it("returns no pages when both discovery paths are empty", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await discoverMetaPages("test-token");

    expect(result.source).toBe("none");
    expect(result.pages).toEqual([]);
  });
});
