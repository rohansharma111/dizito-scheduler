"use client";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type Strategy = {
  strategySummary: string;
  priorities: Array<{ priority: string; rationale: string; goalId: number | null; campaignId: number | null }>;
  recommendations: Array<{ action: string; why: string; channels: string[]; goalId: number | null; campaignId: number | null; productIds: number[]; offerId: number | null }>;
  measurementPlan: Array<{ metric: string; reason: string }>;
  guardrails: string[];
};

export default function AIStrategistClient() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");  const [planning, setPlanning] = useState(false);
  async function generate() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/marketing/strategist", { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to generate strategy"); setStrategy(data.strategy); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to generate strategy"); }
    finally { setLoading(false); }
  }
  function buildWeek() {
    if (!strategy) return;
    sessionStorage.setItem("dizito-strategy-handoff", JSON.stringify(strategy));
    window.location.href = "/generate-my-week?from=strategist";
  }}