export const billingPlans = {
  creator: {
    name: "Creator",

    planId: process.env.RAZORPAY_CREATOR_PLAN!,
  },

  agency: {
    name: "Agency",

    planId: process.env.RAZORPAY_AGENCY_PLAN!,
  },
};
