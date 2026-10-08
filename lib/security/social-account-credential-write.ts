import { encryptSocialCredential } from "@/lib/security/social-credentials";

export type EncryptedSocialCredentialFields = {
  access_token_encrypted: string | null;
  page_access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  credential_encryption_version: "v1";
};

export function encryptSocialCredentialFields(input: {
  accessToken?: string | null;
  pageAccessToken?: string | null;
  refreshToken?: string | null;
}): EncryptedSocialCredentialFields {
  return {
    access_token_encrypted: input.accessToken
      ? encryptSocialCredential(input.accessToken)
      : null,
    page_access_token_encrypted: input.pageAccessToken
      ? encryptSocialCredential(input.pageAccessToken)
      : null,
    refresh_token_encrypted: input.refreshToken
      ? encryptSocialCredential(input.refreshToken)
      : null,
    credential_encryption_version: "v1",
  };
}
