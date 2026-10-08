import { beforeEach, describe, expect, it } from "vitest";

import { encryptSocialCredential } from "./social-credentials";
import { resolveSocialAccountCredentials } from "./social-account-credentials";

describe("social account credential resolver", () => {
  beforeEach(() => {
    process.env.SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("prefers encrypted credentials when available", () => {
    const account = resolveSocialAccountCredentials({
      id: 1,
      access_token: "legacy-access",
      access_token_encrypted: encryptSocialCredential("encrypted-access"),
      page_access_token: "legacy-page",
      page_access_token_encrypted: encryptSocialCredential("encrypted-page"),
      refresh_token: "legacy-refresh",
      refresh_token_encrypted: encryptSocialCredential("encrypted-refresh"),
    });

    expect(account.access_token).toBe("encrypted-access");
    expect(account.page_access_token).toBe("encrypted-page");
    expect(account.refresh_token).toBe("encrypted-refresh");
  });

  it("fails closed when only legacy plaintext credentials exist", () => {
    expect(() =>
      resolveSocialAccountCredentials({
        id: 1,
        access_token: "legacy-access",
        page_access_token: "legacy-page",
        refresh_token: "legacy-refresh",
      }),
    ).toThrow("Legacy plaintext social credential requires migration before use");
  });

  it("rejects malformed encrypted values instead of silently falling back", () => {
    expect(() =>
      resolveSocialAccountCredentials({
        id: 1,
        access_token: "legacy-access",
        access_token_encrypted: "not-encrypted",
      }),
    ).toThrow("Invalid encrypted social credential");
  });
});
