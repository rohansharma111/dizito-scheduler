import { decryptSocialCredential, isEncryptedSocialCredential } from "@/lib/security/social-credentials";

type OAuthSelectionRow = Record<string, unknown>;

function resolve(value: unknown, legacy: unknown): string | null {
  if (typeof value === "string" && value) {
    if (!isEncryptedSocialCredential(value)) {
      throw new Error("Invalid encrypted OAuth credential");
    }
    return decryptSocialCredential(value);
  }
  return typeof legacy === "string" && legacy ? legacy : null;
}

export function resolveOAuthSelectionCredentials<T extends OAuthSelectionRow>(
  row: T,
): T & {
  access_token: string | null;
  refresh_token: string | null;
  pages: string | null;
} {
  return {
    ...row,
    access_token: resolve(row.access_token_encrypted, row.access_token),
    refresh_token: resolve(row.refresh_token_encrypted, row.refresh_token),
    pages: resolve(row.pages_encrypted, row.pages),
  };
}
