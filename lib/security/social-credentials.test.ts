import { beforeEach, describe, expect, it } from "vitest";

import {
  decryptSocialCredential,
  encryptSocialCredential,
  isEncryptedSocialCredential,
} from "./social-credentials";

describe("social credential encryption", () => {
  beforeEach(() => {
    process.env.SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("round-trips credentials without storing plaintext", () => {
    const credential = "provider-secret-token";

    const encrypted = encryptSocialCredential(credential);

    expect(encrypted).not.toContain(credential);
    expect(isEncryptedSocialCredential(encrypted)).toBe(true);
    expect(decryptSocialCredential(encrypted)).toBe(credential);
  });

  it("uses randomized IVs", () => {
    const first = encryptSocialCredential("same-secret");
    const second = encryptSocialCredential("same-secret");

    expect(first).not.toBe(second);
    expect(decryptSocialCredential(first)).toBe("same-secret");
    expect(decryptSocialCredential(second)).toBe("same-secret");
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = JSON.parse(encryptSocialCredential("secret")) as {
      ciphertext: string;
    };

    encrypted.ciphertext = encrypted.ciphertext.slice(0, -1) + "A";

    expect(() => decryptSocialCredential(JSON.stringify(encrypted))).toThrow();
  });

  it("rejects legacy plaintext as encrypted data", () => {
    expect(isEncryptedSocialCredential("legacy-plaintext-token")).toBe(false);
    expect(() => decryptSocialCredential("legacy-plaintext-token")).toThrow();
  });

  it("requires a configured 32-byte key", () => {
    delete process.env.SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY;

    expect(() => encryptSocialCredential("secret")).toThrow(
      "SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY is not configured",
    );
  });
});
