import { describe, expect, it } from "vitest";

import { getRequestIdentity, rateLimitResponse } from "./rate-limit";

describe("rate limit identity", () => {
  it("uses the authenticated tenant identity when a user id is available", () => {
    const request = new Request("https://example.com/api/posts");

    expect(getRequestIdentity(request, 42)).toBe("user:42");
  });

  it("does not persist a raw anonymous IP as the identity", () => {
    process.env.NEXTAUTH_SECRET = "test-secret";

    const request = new Request("https://example.com/api/posts", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 203.0.113.20",
      },
    });

    const identity = getRequestIdentity(request);

    expect(identity).toMatch(/^ip:[a-f0-9]{64}$/);
    expect(identity).not.toContain("203.0.113.10");
  });
});

describe("rate limit response", () => {
  it("returns 429 with Retry-After when blocked", async () => {
    const response = rateLimitResponse({
      allowed: false,
      limit: 10,
      remaining: 0,
      retryAfterSeconds: 23,
    });

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("23");
    await expect(response?.json()).resolves.toEqual({
      success: false,
      error: "Too many requests. Please try again later.",
      retryAfter: 23,
    });
  });

  it("does not create a response when allowed", () => {
    const response = rateLimitResponse({
      allowed: true,
      limit: 10,
      remaining: 9,
      retryAfterSeconds: 60,
    });

    expect(response).toBeNull();
  });
});
