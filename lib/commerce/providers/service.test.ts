import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  draft: vi.fn(),
  publish: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/lib/platforms/woocommerce/draft", () => ({
  prepareWooCommerceListingDraft: mocks.draft,
}));
vi.mock("@/lib/platforms/woocommerce/publish", () => ({
  publishWooCommerceProduct: mocks.publish,
}));
vi.mock("@/lib/platforms/woocommerce/reconcile", () => ({
  reconcileWooCommercePublish: mocks.reconcile,
}));

import {
  commerceProviderAdapters,
  getCommerceProviderAdapter as getRegisteredAdapter,
} from "@/lib/commerce/providers/registry";
import {
  getCommerceProviderAdapter,
  prepareCommerceProviderDraft,
  publishCommerceProvider,
  reconcileCommerceProvider,
  requireCommerceProviderAdapter,
} from "@/lib/commerce/providers/service";

describe("commerce provider service", () => {
  it("resolves registered providers", () => {
    expect(commerceProviderAdapters.flipkart.provider).toBe("flipkart");
    expect(commerceProviderAdapters.woocommerce.provider).toBe("woocommerce");
    expect(getRegisteredAdapter("flipkart")).toBe(commerceProviderAdapters.flipkart);
    expect(getRegisteredAdapter("woocommerce")).toBe(commerceProviderAdapters.woocommerce);
    expect(getCommerceProviderAdapter("woocommerce")).toBe(commerceProviderAdapters.woocommerce);
  });

  it("rejects unsupported providers", () => {
    expect(() => requireCommerceProviderAdapter("unsupported")).toThrow(
      "COMMERCE_PROVIDER_NOT_SUPPORTED",
    );
  });

  it("dispatches draft through the registered adapter", async () => {
    mocks.draft.mockResolvedValue({ listing: { id: "l1" } });
    const result = await prepareCommerceProviderDraft("woocommerce", {
      context: { channelId: "c1", userId: 1 },
      payload: { action: "draft", input: {} },
    });
    expect(result.status).toBe("succeeded");
    expect(mocks.draft).toHaveBeenCalled();
  });

  it("dispatches publish through the registered adapter", async () => {
    mocks.publish.mockResolvedValue({ externalId: "101" });
    const result = await publishCommerceProvider("woocommerce", {
      context: { channelId: "c1", userId: 1 },
      payload: { action: "publish", input: {} },
      confirmLivePublish: true,
    });
    expect(result.externalId).toBe("101");
    expect(mocks.publish).toHaveBeenCalled();
  });

  it("dispatches reconciliation through the registered adapter", async () => {
    mocks.reconcile.mockResolvedValue({ externalId: "101" });
    const result = await reconcileCommerceProvider("woocommerce", {
      context: { channelId: "c1", userId: 1 },
      payload: { action: "reconcile", input: {} },
      externalId: "101",
    });
    expect(result.externalId).toBe("101");
    expect(mocks.reconcile).toHaveBeenCalled();
  });

  it("dispatches Flipkart through the shared provider service", async () => {
    const adapter = commerceProviderAdapters.flipkart;
    const originalDraft = adapter.prepareDraft;
    const originalPublish = adapter.publish;
    const originalReconcile = adapter.reconcilePublish;

    const draft = vi.fn().mockResolvedValue({
      operation: "draft",
      status: "succeeded",
      data: { listing: { id: "fk-listing" } },
    });
    const publish = vi.fn().mockResolvedValue({
      operation: "publish",
      status: "ambiguous",
      error: { code: "RECONCILIATION_REQUIRED", message: "reconcile", retryable: false, ambiguous: true },
    });
    const reconcile = vi.fn().mockResolvedValue({
      operation: "reconcile",
      status: "succeeded",
      externalId: "FK-123",
    });

    adapter.prepareDraft = draft;
    adapter.publish = publish;
    adapter.reconcilePublish = reconcile;

    try {
      const draftResult = await prepareCommerceProviderDraft("flipkart", {
        context: { channelId: "fk-channel", userId: 7 },
        payload: { action: "draft", input: {} },
      });
      const publishResult = await publishCommerceProvider("flipkart", {
        context: { channelId: "fk-channel", userId: 7 },
        payload: { action: "publish", input: {} },
        confirmLivePublish: true,
      });
      const reconcileResult = await reconcileCommerceProvider("flipkart", {
        context: { channelId: "fk-channel", userId: 7 },
        payload: { action: "reconcile", input: {} },
        lookupKey: "SKU-1",
      });

      expect(draftResult.status).toBe("succeeded");
      expect(publishResult.status).toBe("ambiguous");
      expect(reconcileResult.externalId).toBe("FK-123");
      expect(draft).toHaveBeenCalledWith({
        context: { channelId: "fk-channel", userId: 7 },
        payload: { action: "draft", input: {} },
      });
      expect(publish).toHaveBeenCalledWith({
        context: { channelId: "fk-channel", userId: 7 },
        payload: { action: "publish", input: {} },
        confirmLivePublish: true,
      });
      expect(reconcile).toHaveBeenCalledWith({
        context: { channelId: "fk-channel", userId: 7 },
        payload: { action: "reconcile", input: {} },
        lookupKey: "SKU-1",
      });
    } finally {
      adapter.prepareDraft = originalDraft;
      adapter.publish = originalPublish;
      adapter.reconcilePublish = originalReconcile;
    }
  });

  it("returns a bounded unsupported-operation result", async () => {
    const adapter = getCommerceProviderAdapter("woocommerce");
    const original = adapter.capabilities.publish;
    (adapter.capabilities as { publish: boolean }).publish = false;

    try {
      const result = await publishCommerceProvider("woocommerce", {
        context: { channelId: "c1", userId: 1 },
        payload: { action: "publish", input: {} },
        confirmLivePublish: true,
      });

      expect(result).toMatchObject({
        operation: "publish",
        status: "failed",
        error: { code: "COMMERCE_OPERATION_NOT_SUPPORTED" },
      });
    } finally {
      (adapter.capabilities as { publish: boolean }).publish = original;
    }
  });
});
