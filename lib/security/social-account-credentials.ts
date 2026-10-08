import {
  decryptSocialCredential,
  isEncryptedSocialCredential,
} from "@/lib/security/social-credentials";

type SocialAccountRow = Record<string, unknown>;

function resolveEncryptedCredential(
  encryptedValue: unknown,
  legacyValue: unknown,
): string | null {
  if (typeof encryptedValue === "string" && encryptedValue) {
    if (!isEncryptedSocialCredential(encryptedValue)) {
      throw new Error("Invalid encrypted social credential");
    }

    return decryptSocialCredential(encryptedValue);
  }

  if (typeof legacyValue === "string" && legacyValue) {
    throw new Error(
      "Legacy plaintext social credential requires migration before use",
    );
  }

  return null;
}

/**
 * Resolve credential-bearing fields at the application boundary.
 *
 * Legacy plaintext columns are intentionally never used as a credential
 * source. Existing rows must be migrated with the controlled backfill before
 * they can be consumed by credential-bearing application paths.
 */
export function resolveSocialAccountCredentials<T extends SocialAccountRow>(
  account: T,
): T & {
  access_token: string | null;
  page_access_token: string | null;
  refresh_token: string | null;
} {
  return {
    ...account,
    access_token: resolveEncryptedCredential(
      account.access_token_encrypted,
      account.access_token,
    ),
    page_access_token: resolveEncryptedCredential(
      account.page_access_token_encrypted,
      account.page_access_token,
    ),
    refresh_token: resolveEncryptedCredential(
      account.refresh_token_encrypted,
      account.refresh_token,
    ),
  };
}
