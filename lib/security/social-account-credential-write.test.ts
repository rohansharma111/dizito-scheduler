import { beforeEach, describe, expect, it } from "vitest";

import { encryptSocialCredentialFields } from "./social-account-credential-write";
import { decryptSocialCredential } from "./social-credentials";

describe("social account credential encryption writes", () => {
  beforeEach(() => {
    process.env.SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("encrypts each populated credential field", () => {
    const fields = encryptSocialCredentialFields({
      accessToken: "access-token",
      pageAccessToken: "page-token",
      refreshToken: "refresh-token",
    });

    expect(fields.credential_encryption_version).toBe("v1");
    expect(fields.access_token_encrypted).not.toBe("access-token");
    expect(fields.page_access_token_encrypted).not.toBe("page-token");
    expect(fields.refresh_token_encrypted).not.toBe("refresh-token");

    expect(
      decryptSocialCredential(fields.access_token_encrypted!),
    ).toBe("access-token");
    expect(
      decryptSocialCredential(fields.page_access_token_encrypted!),
    ).toBe("page-token");
    expect(
      decryptSocialCredential(fields.refresh_token_encrypted!),
    ).toBe("refresh-token");
  });

  it("leaves absent credentials null", () => {
    expect(
      encryptSocialCredentialFields({
        accessToken: null,
        pageAccessToken: undefined,
        refreshToken: "",
      }),
    ).toEqual({
      access_token_encrypted: null,
      page_access_token_encrypted: null,
      refresh_token_encrypted: null,
      credential_encryption_version: "v1",
    });
  });
});
