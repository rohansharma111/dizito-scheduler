import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createCommerceChannel,
  getCommerceChannelByExternalAccount,
  updateCommerceChannel,
} from "@/lib/commerce/channels/service";
import { saveShopifyCredentials } from "@/lib/commerce/channels/credentials";
import {
  exchangeShopifyAuthorizationCode,
  getShopifyApiVersion,
  getShopifyStateCookieName,
  normalizeShopDomain,
  verifyOAuthState,
} from "@/lib/platforms/shopify/auth";

function getCookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function redirectWithError(request: Request, message: string) {
  const url = new URL("/accounts", request.url);
  url.searchParams.set("commerce", "shopify");
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirectWithError(request, "Unauthorized");
  }

  const userId = Number(session.user.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return redirectWithError(request, "Unauthorized");
  }

  try {
    const url = new URL(request.url);
    const shopParam = url.searchParams.get("shop");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError(request, `Shopify authorization failed: ${error}`);
    }

    const cookieState = getCookieValue(request, getShopifyStateCookieName());

    if (!state || !cookieState || state !== cookieState || !verifyOAuthState(state)) {
      return redirectWithError(request, "Invalid or expired Shopify authorization state");
    }

    if (!shopParam || !code) {
      return redirectWithError(request, "Shopify authorization response is incomplete");
    }

    const shop = normalizeShopDomain(shopParam);
    const token = await exchangeShopifyAuthorizationCode(shop, code);

    const existingChannel = await getCommerceChannelByExternalAccount(
      userId,
      "shopify",
      shop,
    );

    const channel = existingChannel
      ? await updateCommerceChannel(String(existingChannel.id), userId, {
          name: shop,
          externalAccountId: shop,
          status: "inactive",
          metadata: {
            ...(existingChannel.metadata ?? {}),
            shopDomain: shop,
            apiVersion: getShopifyApiVersion(),
          },
        })
      : await createCommerceChannel(userId, {
          provider: "shopify",
          name: shop,
          externalAccountId: shop,
          status: "inactive",
          metadata: {
            shopDomain: shop,
            apiVersion: getShopifyApiVersion(),
          },
        });

    if (!channel) {
      throw new Error("Unable to prepare Shopify channel");
    }

    const accessTokenExpiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : null;
    const refreshTokenExpiresAt = token.refresh_token_expires_in
      ? new Date(Date.now() + token.refresh_token_expires_in * 1000)
      : null;

    try {
      await saveShopifyCredentials({
        channelId: String(channel.id),
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        scopes: token.scope,
      });
    } catch (credentialError) {
      await updateCommerceChannel(String(channel.id), userId, {
        status: "error",
      }).catch((statusError) => {
        console.error("Unable to mark Shopify channel as error:", statusError);
      });
      throw credentialError;
    }

    await updateCommerceChannel(String(channel.id), userId, {
      status: "active",
    });

    const successUrl = new URL("/accounts", request.url);
    successUrl.searchParams.set("commerce", "shopify");
    successUrl.searchParams.set("connected", "1");

    const response = NextResponse.redirect(successUrl);
    response.cookies.delete(getShopifyStateCookieName());
    return response;
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return redirectWithError(
      request,
      error instanceof Error ? error.message : "Unable to complete Shopify connection",
    );
  }
}
