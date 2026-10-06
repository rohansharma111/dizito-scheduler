# Pinterest Standard Access Review Readiness

## App

- App ID: 1595258
- Product: Dizito social media management platform
- Integration: Pinterest API v5 with OAuth 2.0 Authorization Code flow
- Language/runtime: TypeScript, Next.js, Node.js
- Intended users: independent Dizito users connecting their own Pinterest Business accounts

## OAuth flow

1. The user starts Pinterest connection from Dizito.
2. Dizito redirects the user to Pinterest's OAuth authorization page.
3. Dizito validates the OAuth state value on callback.
4. Dizito exchanges the authorization code server-side using the Pinterest client secret.
5. Dizito retrieves the authorized Pinterest account and boards.
6. Dizito accepts only Pinterest Business accounts for this integration.
7. On first connection, the user selects the board(s) they want Dizito to manage.
8. On reconnect, the existing account and board are restored without repeating board selection.
9. Access and refresh-token metadata is stored server-side; credentials are never collected from the user directly.

## Pinterest API usage

Dizito uses the Pinterest API only on behalf of the Pinterest account owner after explicit OAuth authorization. The current integration uses the minimum scopes required for its implemented board-reading and Pin-publishing workflow:

- boards:read
- pins:read
- pins:write
- user_accounts:read

Dizito does not request Pinterest passwords or Pinterest session cookies.

## Disconnect and data handling

When a user disconnects a Pinterest account:

- the Dizito social-account record is deleted;
- stored Pinterest access and refresh credentials are removed with that record;
- Pinterest account and board identifiers stored with that connection are removed;
- account-scoped system events containing those identifiers are removed;
- associated post-target records are removed through the social-account relationship;
- pending Pinterest OAuth session data is not retained after the connection flow completes.

Dizito-created content history is separate from Pinterest credentials and may remain until the user deletes that Dizito content or requests account/data deletion.

The public privacy policy states that Dizito is independent and is not endorsed by, sponsored by, or affiliated with Pinterest.

## Standard Access demo checklist

The demo recording should show:

- Dizito Accounts page;
- clicking Connect Pinterest;
- Pinterest OAuth authorization page;
- the user explicitly granting requested permissions;
- return to Dizito;
- Pinterest Business account/board retrieval;
- selecting a board during first connection;
- creating or scheduling Pinterest content;
- publishing a Pin to the user's own Pinterest Business account;
- disconnecting the Pinterest account;
- the disconnected Pinterest account no longer appearing as an active Dizito target.

Avoid showing client secrets, access tokens, refresh tokens, or other credentials in the recording.
