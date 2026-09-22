import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCommerceChannel } from "@/lib/commerce/channels/service";
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
    const config = { storeUrl, consumerKey, consumerSecret };

    await getWooCommerceSystemStatus(config);

    const channel = await createCommerceChannel(Number(session.user.id), {
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

    await saveWooCommerceCredentials({
      channelId: channel.id,
      consumerKey,
      consumerSecret,
    });

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
