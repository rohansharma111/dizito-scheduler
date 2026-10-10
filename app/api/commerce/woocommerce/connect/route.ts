import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCommerceChannel, getCommerceChannelByExternalAccount, getCommerceChannelCapacity, updateCommerceChannel } from "@/lib/commerce/channels/service";
import { getWooCommerceSystemStatus, normalizeWooCommerceStoreUrl } from "@/lib/platforms/woocommerce/client";
import { saveWooCommerceCredentials } from "@/lib/platforms/woocommerce/credentials";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const storeUrlInput = typeof body.storeUrl === "string" ? body.storeUrl : "";
    const consumerKey = typeof body.consumerKey === "string" ? body.consumerKey.trim() : "";
    const consumerSecret = typeof body.consumerSecret === "string" ? body.consumerSecret.trim() : "";

    if (!name || !storeUrlInput || !consumerKey || !consumerSecret) {
      return NextResponse.json({ success: false, error: "name, storeUrl, consumerKey, and consumerSecret are required" }, { status: 400 });
    }

    const storeUrl = normalizeWooCommerceStoreUrl(storeUrlInput);
    const existingChannel = await getCommerceChannelByExternalAccount(userId, "woocommerce", storeUrl);
    const config = { storeUrl, consumerKey, consumerSecret };

    // Always verify the submitted credentials before creating or repairing a channel.
    await getWooCommerceSystemStatus(config);
    const verifiedAt = new Date().toISOString();

    if (existingChannel) {
      // Reconnect in place: do not create a duplicate channel for the same store.
      await saveWooCommerceCredentials({ channelId: existingChannel.id, userId, consumerKey, consumerSecret });
      const channel = await updateCommerceChannel(existingChannel.id, userId, {
        name,
        status: "active",
        metadata: {
          storeUrl,
          connection: { status: "verified", verifiedAt },
          woocommerceHealth: { status: "healthy", verifiedAt },
        },
      });
      if (!channel || "error" in channel) {
        throw new Error("WooCommerce connection was verified, but the existing channel could not be updated");
      }
      return NextResponse.json({ success: true, channel: { id: channel.id, provider: channel.provider, name: channel.name, external_account_id: channel.external_account_id, status: channel.status, metadata: channel.metadata }, reconnected: true }, { status: 200 });
    }

    const capacity = await getCommerceChannelCapacity(userId);
    if (!capacity.allowed) {
      return NextResponse.json({
        success: false,
        error: "Commerce channel limit reached",
        code: "COMMERCE_CHANNEL_LIMIT_REACHED",
        usage: { used: capacity.used, limit: capacity.limit },
        message: "Your plan has reached its commerce connection limit. Reconnect an existing store or compare plans to add another. Existing connections have not been changed.",
      }, { status: 409 });
    }

    const channel = await createCommerceChannel(userId, {
      provider: "woocommerce",
      name,
      externalAccountId: storeUrl,
      status: "active",
      metadata: { storeUrl, connection: { status: "verified", verifiedAt } },
    });

    try {
      await saveWooCommerceCredentials({ channelId: channel.id, userId, consumerKey, consumerSecret });
    } catch (credentialError) {
      await updateCommerceChannel(channel.id, userId, { status: "error", metadata: { connection: { status: "credential_persistence_failed", failedAt: new Date().toISOString() } } });
      throw credentialError;
    }

    return NextResponse.json({ success: true, channel: { id: channel.id, provider: channel.provider, name: channel.name, external_account_id: channel.external_account_id, status: channel.status, metadata: channel.metadata } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/commerce/woocommerce/connect error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to connect WooCommerce store" }, { status: 400 });
  }
}
