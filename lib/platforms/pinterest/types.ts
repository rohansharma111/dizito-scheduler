/*
|--------------------------------------------------------------------------
| Pinterest OAuth Token
|--------------------------------------------------------------------------
*/

export interface PinterestToken {
  accessToken: string;

  refreshToken?: string;

  tokenType?: string;

  scope?: string;

  expiresIn?: number;
}

/*
|--------------------------------------------------------------------------
| Pinterest User
|--------------------------------------------------------------------------
*/

export interface PinterestProfile {
  id: string;

  username: string;

  displayName: string;

  profileImage?: string;
}

/*
|--------------------------------------------------------------------------
| Pinterest Board
|--------------------------------------------------------------------------
*/

export interface PinterestBoard {
  id: string;

  name: string;

  description?: string;

  privacy?: "PUBLIC" | "PROTECTED" | "SECRET";

  pinCount?: number;

  followerCount?: number;

  imageUrl?: string;
}

/*
|--------------------------------------------------------------------------
| Pinterest OAuth State
|--------------------------------------------------------------------------
*/

export interface PinterestOAuthState {
  state: string;

  createdAt: Date;
}

/*
|--------------------------------------------------------------------------
| Pinterest Connection
|--------------------------------------------------------------------------
*/

export interface PinterestConnection {
  profile: PinterestProfile;

  token: PinterestToken;

  boards: PinterestBoard[];
}