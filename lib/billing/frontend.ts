export type StartSubscriptionOptions = {
  plan: "growth" | "pro";
};

export type BillingResult =
  | { success: true }
  | { success: false; error: string };

declare global {
  interface Window {
    Razorpay: any;
  }
}

let razorpayLoaded = false;

async function loadRazorpayScript(): Promise<void> {
  if (razorpayLoaded || window.Razorpay) {
    razorpayLoaded = true;
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      razorpayLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

export async function startSubscription(
  options: StartSubscriptionOptions,
): Promise<BillingResult> {
  try {
    await loadRazorpayScript();

    const response = await fetch("/api/billing/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: options.plan }),
    });
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error ?? "Failed to create subscription" };
    }

    return await new Promise<BillingResult>((resolve) => {
      const razorpay = new window.Razorpay({
        key: data.razorpayKey,
        subscription_id: data.subscriptionId,
        name: "Dizito",
        description: `${options.plan[0].toUpperCase()}${options.plan.slice(1)} Plan`,
        image: "/logo/logo.png",
        handler: async (payload: any) => {
          try {
            const verifyResponse = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const verifyData = await verifyResponse.json();
            resolve(
              verifyResponse.ok && verifyData.success
                ? { success: true }
                : { success: false, error: verifyData.error ?? "Verification failed" },
            );
          } catch (error) {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : "Verification failed",
            });
          }
        },
        modal: {
          ondismiss() {
            resolve({ success: false, error: "Checkout cancelled" });
          },
        },
      });
      razorpay.open();
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Billing failed",
    };
  }
}
