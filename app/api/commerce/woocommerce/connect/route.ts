import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createCommerceChannel,
  getCommerceChannelByExternalAccount,
  updateCommerceChannel,
} from "@/lib/commerce/channels/service";
import {
  getWooCommerceSystemStatus,
  normalizeWooCommerceStoreUrl,
} from "@/lib/platforms/woocommerce/client";
import { saveWooCommerceCredentials } from "@/lib/platforms/woocommerce/credentials";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId = Number(session.user.id);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const storeUrlInput = typeof body.storeUrl === "string" ? body.storeUrl : "";
    const consumerKey = typeof body.consumerKey === "string" ? body.consumerKey.trim() : "";
    const consumerSecret = typeof body.consumerSecret === "string" ? body.consumerSecret.trim() : "";

    if (!name || !storeUrlInput || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { success: false, error: "name, storeUrl, consumerKey, and consumerSecret are required" },
        { status: 400 },
      );
    }

    const storeUrl = normalizeWooCommerceStoreUrl(storeUrlInput);
    const existingChannel = await getCommerceChannelByExternalAccount(
      userId,
      "woocommerce",
      storeUrl,
    );

    if (existingChannel) {
      return NextResponse.json(
        {
          success: false,
          error: "This WooCommerce store is already connected",
          channel: {
            id: existingChannel.id,
            status: existingChannel.status,
          },
        },
        { status: 409 },
      );
    }

    const config = { storeUrl, consumerKey, consumerSecret };
    await getWooCommerceSystemStatus(config);

    const channel = await createCommerceChannel(userId, {
      provider: "woocommerce",
      name,
      externalAccountId: storeUrl,
      status: "active",
      metadata: {
        storeUrl,
        connection: {
          status: "verified",
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    try {
      await saveWooCommerceCredentials({
        channelId: channel.id,
        consumerKey,
        consumerSecret,
      });
    } catch (credentialError) {
      await updateCommerceChannel(channel.id, userId, {
        status: "error",
        metadata: {
          connection: {
            status: "credential_persistence_failed",
            failedAt: new Date().toISOString(),
          },
        },
      });
      throw credentialError;
    }

    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        provider: channel.provider,
        name: channel.name,
        external_account_id: channel.external_account_id,
        status: channel.status,
        metadata: channel.metadata,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/commerce/woocommerce/connect error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to connect WooCommerce store" },
      { status: 400 },
    );
  }
}
