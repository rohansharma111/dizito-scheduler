export const billingLogger = {
  info(...args: unknown[]) {
    console.log("[BILLING]", ...args);
  },

  warn(...args: unknown[]) {
    console.warn("[BILLING]", ...args);
  },

  error(...args: unknown[]) {
    console.error("[BILLING]", ...args);
  },
};
