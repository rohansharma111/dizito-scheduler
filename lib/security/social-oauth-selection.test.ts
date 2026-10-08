import { beforeEach, describe, expect, it } from "vitest";

import { encryptSocialCredential } from "./social-credentials";
import { resolveOAuthSelectionCredentials } from "./social-oauth-selection";

describe("resolveOAuthSelectionCredentials", () => {
  beforeEach(() => {
    process.env.SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("prefers encrypted OAuth credentials and payloads", () => {
    const row = {
      access_token: "legacy-token",
      access_token_encrypted: encryptSocialCredential("encrypted-token"),
      refresh_token: "legacy-refresh",
      refresh_token_encrypted: encryptSocialCredential("encrypted-refresh"),
      pages: "legacy-pages",
      pages_encrypted: encryptSocialCredential("encrypted-pages"),
    };

    expect(resolveOAuthSelectionCredentials(row)).toMatchObject({
      access_token: "encrypted-token",
      refresh_token: "encrypted-refresh",
      pages: "encrypted-pages",
    });
  });

  it("falls back to legacy values during migration", () => {
    expect(
      resolveOAuthSelectionCredentials({
        access_token: "legacy-token",
        refresh_token: "legacy-refresh",
        pages: "legacy-pages",
      }),
    ).toMatchObject({
      access_token: "legacy-token",
      refresh_token: "legacy-refresh",
      pages: "legacy-pages",
    });
  });

  it("fails closed on malformed encrypted values", () => {
    expect(() =>
      resolveOAuthSelectionCredentials({
        access_token: "legacy-token",
        access_token_encrypted: "not-ciphertext",
      }),
    ).toThrow("Invalid encrypted OAuth credential");
  });
});
