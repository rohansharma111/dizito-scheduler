export const billingLogger = {
  info(...args: any[]) {
    console.log("[BILLING]", ...args);
  },

  warn(...args: any[]) {
    console.warn("[BILLING]", ...args);
  },

  error(...args: any[]) {
    console.error("[BILLING]", ...args);
  },
};
