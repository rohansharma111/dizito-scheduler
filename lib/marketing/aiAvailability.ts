export function isMarketingAIEnabled(): boolean {
  // Opt-in only: AI remains off until the operator explicitly enables it after configuring usage funding.
  return process.env.DIZITO_AI_ENABLED === "true";
}

export const MARKETING_AI_COMING_SOON_MESSAGE =
  "AI-powered generation is coming soon. You can continue with editable templates and manual planning in the meantime.";
