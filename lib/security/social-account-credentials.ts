import {
  decryptSocialCredential,
  isEncryptedSocialCredential,
} from "@/lib/security/social-credentials";

type SocialAccountRow = Record<string, unknown>;

function resolveCredential(
  encryptedValue: unknown,
  legacyValue: unknown,
): string | null {
  if (typeof encryptedValue === "string" && encryptedValue) {
    if (!isEncryptedSocialCredential(encryptedValue)) {
      throw new Error("Invalid encrypted social credential");
    }

    return decryptSocialCredential(encryptedValue);
  }

  return typeof legacyValue === "string" && legacyValue ? legacyValue : null;
}

/**
 * Resolve credential-bearing fields at the application boundary.
 *
 * Encrypted columns are intentionally optional so this resolver can be
 * deployed before the additive database migration. Legacy plaintext values
 * remain a compatibility fallback until all rows are migrated.
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
    access_token: resolveCredential(
      account.access_token_encrypted,
      account.access_token,
    ),
    page_access_token: resolveCredential(
      account.page_access_token_encrypted,
      account.page_access_token,
    ),
    refresh_token: resolveCredential(
      account.refresh_token_encrypted,
      account.refresh_token,
    ),
  };
}
