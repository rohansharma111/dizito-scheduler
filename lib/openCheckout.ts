declare global {
  interface Window {
    Razorpay: any;
  }
}

export async function openCheckout(
  subscriptionId: string,
  planName: string,
  user: {
    name?: string;
    email?: string;
    contact?: string;
  },
) {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay SDK not loaded"));

      return;
    }

    const razorpay = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,

      subscription_id: subscriptionId,

      name: "Dizito",

      description: `${planName} Subscription`,

      image: "/logo.png",

      prefill: {
        name: user.name || "",

        email: user.email || "",

        contact: user.contact || "",
      },

      theme: {
        color: "#2563eb",
      },

      handler: function (response: any) {
        resolve(response);
      },

      modal: {
        ondismiss() {
          reject(new Error("Checkout cancelled"));
        },
      },
    });

    razorpay.open();
  });
}
