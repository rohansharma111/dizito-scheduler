import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createCommerceChannel,
  getCommerceChannelByExternalAccount,
  getCommerceChannelCapacity,
  updateCommerceChannel,
} from "@/lib/commerce/channels/service";
import { saveAmazonCredentials } from "@/lib/commerce/channels/amazon-credentials";
import {
  exchangeAmazonAuthorizationCode,
  getAmazonMarketplaceId,
  getAmazonStateCookieName,
  getAmazonSpApiEndpoint,
  verifyAmazonOAuthState,
} from "@/lib/platforms/amazon/auth";

function getCookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function redirectWithError(request: Request, message: string) {
  const url = new URL("/accounts", request.url);
  url.searchParams.set("commerce", "amazon");
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return redirectWithError(request, "Unauthorized");

  try {
    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) return redirectWithError(request, "Unauthorized");
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const sellingPartnerId = url.searchParams.get("selling_partner_id");
    const oauthCode = url.searchParams.get("spapi_oauth_code");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError(request, `Amazon authorization failed: ${error}`);
    }

    const cookieState = getCookieValue(request, getAmazonStateCookieName());
    if (
      !state ||
      !cookieState ||
      state !== cookieState ||
      !verifyAmazonOAuthState(state, userId)
    ) {
      return redirectWithError(request, "Invalid or expired Amazon authorization state");
    }

    if (!sellingPartnerId || !oauthCode) {
      return redirectWithError(request, "Amazon authorization response is incomplete");
    }

    const token = await exchangeAmazonAuthorizationCode(oauthCode);
    if (!token.refresh_token) {
      throw new Error("Amazon authorization did not return a refresh token");
    }

    const existingChannel = await getCommerceChannelByExternalAccount(
      userId,
      "amazon",
      sellingPartnerId,
    );

    if (!existingChannel) {
      const capacity = await getCommerceChannelCapacity(userId);
      if (!capacity.allowed) {
        return redirectWithError(request, "Commerce channel limit reached (" + capacity.used + "/" + capacity.limit + "). Reconnect an existing store or compare plans; existing connections were not changed.");
      }
    }

    const channel = existingChannel
      ? await updateCommerceChannel(String(existingChannel.id), userId, {
          name: `Amazon India (${sellingPartnerId})`,
          externalAccountId: sellingPartnerId,
          status: "inactive",
          metadata: {
            ...(existingChannel.metadata ?? {}),
            marketplaceId: getAmazonMarketplaceId(),
            spApiEndpoint: getAmazonSpApiEndpoint(),
          },
        })
      : await createCommerceChannel(userId, {
          provider: "amazon",
          name: `Amazon India (${sellingPartnerId})`,
          externalAccountId: sellingPartnerId,
          status: "inactive",
          metadata: {
            marketplaceId: getAmazonMarketplaceId(),
            spApiEndpoint: getAmazonSpApiEndpoint(),
          },
        });

    if (!channel) throw new Error("Unable to prepare Amazon channel");

    try {
      await saveAmazonCredentials({
        channelId: String(channel.id),
        userId,
        refreshToken: token.refresh_token,
        refreshTokenExpiresAt: token.refresh_token_expires_in
          ? new Date(Date.now() + token.refresh_token_expires_in * 1000)
          : null,
      });
    } catch (credentialError) {
      await updateCommerceChannel(String(channel.id), userId, { status: "error" }).catch(
        (statusError) => console.error("Unable to mark Amazon channel as error:", statusError),
      );
      throw credentialError;
    }

    await updateCommerceChannel(String(channel.id), userId, { status: "active" });

    const successUrl = new URL("/accounts", request.url);
    successUrl.searchParams.set("commerce", "amazon");
    successUrl.searchParams.set("connected", "1");

    const response = NextResponse.redirect(successUrl);
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.delete(getAmazonStateCookieName());
    return response;
  } catch (error) {
    console.error("Amazon OAuth callback error:", error);
    return redirectWithError(
      request,
      error instanceof Error ? error.message : "Unable to complete Amazon connection",
    );
  }
}
