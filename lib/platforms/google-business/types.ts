export interface GoogleBusinessTokenResponse {
  accessToken: string;

  refreshToken?: string;

  expiresIn: number;

  scope?: string;

  tokenType?: string;
}

export interface GoogleBusinessProfile {
  id: string;

  name: string;

  email: string;

  picture?: string;
}

export interface GoogleBusinessLocation {
  id: string;

  name: string;

  storeCode?: string;

  accountId: string;

  accountName: string;
}

export interface GoogleBusinessOAuthPayload {
  profile: GoogleBusinessProfile;

  locations: GoogleBusinessLocation[];
}
