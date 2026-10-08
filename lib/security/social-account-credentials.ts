import {
  decryptSocialCredential,
  isEncryptedSocialCredential,
} from "@/lib/security/social-credentials";

type SocialAccountRow = Record<string, unknown>;

function resolveEncryptedCredential(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (typeof value !== "string" || !isEncryptedSocialCredential(value)) {
    throw new Error("Invalid encrypted social credential");
  }

  return decryptSocialCredential(value);
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
    access_token: resolveEncryptedCredential(account.access_token_encrypted),
    page_access_token: resolveEncryptedCredential(
      account.page_access_token_encrypted,
    ),
    refresh_token: resolveEncryptedCredential(account.refresh_token_encrypted),
  };
}
