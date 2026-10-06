import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  exchangeFlipkartAuthorizationCode,
  getFlipkartStateCookieName,
  getFlipkartOAuthEnvironment,
  verifyOAuthState,
} from "@/lib/platforms/flipkart/auth";
import { createCommerceChannel, getCommerceChannelByExternalAccount, updateCommerceChannel } from "@/lib/commerce/channels/service";
import { saveFlipkartCredentials } from "@/lib/platforms/flipkart/credentials";

function getCookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function redirectWithError(request: Request, message: string) {
  const url = new URL("/accounts", request.url);
  url.searchParams.set("commerce", "flipkart");
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirectWithError(request, "Unauthorized");
  }

  try {
    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return redirectWithError(request, "Invalid authenticated user");
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError(request, `Flipkart authorization failed: ${error}`);
    }

    const cookieState = getCookieValue(request, getFlipkartStateCookieName());
    if (
      !state ||
      !cookieState ||
      state !== cookieState ||
      !verifyOAuthState(state, userId)
    ) {
      return redirectWithError(request, "Invalid or expired Flipkart authorization state");
    }

    if (!code) {
      return redirectWithError(request, "Flipkart authorization response is incomplete");
    }

    const token = await exchangeFlipkartAuthorizationCode(code, state);
    const environment = getFlipkartOAuthEnvironment();

    const existingChannel = await getCommerceChannelByExternalAccount(
      userId,
      "flipkart",
      "flipkart",
    );

    const channel = existingChannel
      ? await updateCommerceChannel(String(existingChannel.id), userId, {
          name: "Flipkart",
          externalAccountId: "flipkart",
          status: "inactive",
          metadata: {
            ...(existingChannel.metadata ?? {}),
            flipkartEnvironment: environment,
          },
        })
      : await createCommerceChannel(userId, {
          provider: "flipkart",
          name: "Flipkart",
          externalAccountId: "flipkart",
          status: "inactive",
          metadata: {
            flipkartEnvironment: environment,
          },
        });

    if (!channel) {
      throw new Error("Unable to prepare Flipkart channel");
    }

    try {
      await saveFlipkartCredentials({
        channelId: String(channel.id),
        userId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        appId: process.env.FLIPKART_CLIENT_ID,
        appSecret: process.env.FLIPKART_CLIENT_SECRET,
        accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        refreshTokenExpiresAt: new Date(
          Date.now() + token.refresh_token_expires_in * 1000,
        ),
      });
    } catch (credentialError) {
      await updateCommerceChannel(String(channel.id), userId, {
        status: "error",
      }).catch((statusError) => {
        console.error("Unable to mark Flipkart channel as error:", statusError);
      });
      throw credentialError;
    }

    await updateCommerceChannel(String(channel.id), userId, {
      status: "active",
    });

    const successUrl = new URL("/accounts", request.url);
    successUrl.searchParams.set("commerce", "flipkart");
    successUrl.searchParams.set("connected", "1");

    const response = NextResponse.redirect(successUrl);
    response.cookies.delete(getFlipkartStateCookieName());
    return response;
  } catch (error) {
    console.error("Flipkart OAuth callback error:", error);
    return redirectWithError(
      request,
      error instanceof Error ? error.message : "Unable to complete Flipkart connection",
    );
  }
}
