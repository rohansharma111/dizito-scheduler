"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";

type Impact = {
  actionSummary: Array<{ actionType:string; count:number; value:number }>;
  observedCampaignSummary:Array<{campaignId:number|null;campaignName:string|null;actionType:string;count:number;value:number}>;
  attributionSummary:Array<{campaignId:number|null;campaignName:string|null;actionType:string;count:number;attributedValue:number}>;
  revenueSummary:{observedLinkedOrderCount:number;observedPurchaseValue:number;attributedOrderCount:number;attributedValue:number};
};

function label(value:string){ return value.replaceAll("_"," ").replace(/\b\w/g,(c)=>c.toUpperCase()); }

export default function BusinessImpactClient(){
 const [impact,setImpact]=useState<Impact|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{ fetch("/api/marketing/business-impact").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Failed to load business impact");setImpact(d.businessImpact)}).catch(e=>setError(e instanceof Error?e.message:"Failed to load business impact")).finally(()=>setLoading(false)); },[]);
 if(loading)return <div className="py-16 text-center text-gray-500"><Loader2 className="mx-auto animate-spin" size={20}/><div className="mt-2">Loading business impact...</div></div>;
 if(error)return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
 if(!impact)return null;
 return <div className="mx-auto max-w-6xl space-y-6">
  <header className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><BarChart3 size={22}/></div><div><h1 className="text-2xl font-bold text-gray-900">Business Impact</h1><p className="mt-1 text-sm text-gray-500">Separate observed customer outcomes from explicitly attributed marketing outcomes.</p></div></div></header>
  <section className="grid gap-4 md:grid-cols-4">
   <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="text-sm text-gray-500">Observed linked orders</div><div className="mt-2 text-3xl font-bold">{impact.revenueSummary.observedLinkedOrderCount}</div></div>
   <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="text-sm text-gray-500">Observed purchase value</div><div className="mt-2 text-3xl font-bold">{impact.revenueSummary.observedPurchaseValue}</div></div>
   <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="text-sm text-gray-500">Explicitly attributed orders</div><div className="mt-2 text-3xl font-bold">{impact.revenueSummary.attributedOrderCount}</div></div>
   <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="text-sm text-gray-500">Explicitly attributed value</div><div className="mt-2 text-3xl font-bold">{impact.revenueSummary.attributedValue}</div></div>
  </section>
  <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Customer actions</h2><div className="mt-4 divide-y">{impact.actionSummary.length===0?<p className="py-6 text-sm text-gray-500">No completed customer actions yet.</p>:impact.actionSummary.map(a=><div key={a.actionType} className="flex items-center justify-between py-3"><span className="text-sm font-medium">{label(a.actionType)}</span><span className="text-sm text-gray-600">{a.count} · value {a.value}</span></div>)}</div></section>
  <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Explicit attribution</h2><p className="mt-1 text-sm text-gray-500">Only attribution records explicitly attached to a customer action are shown here. This does not infer causality.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="py-2 pr-4">Campaign</th><th className="py-2 pr-4">Action</th><th className="py-2 pr-4">Attributions</th><th className="py-2">Attributed value</th></tr></thead><tbody>{impact.attributionSummary.length===0?<tr><td colSpan={4} className="py-6 text-gray-500">No explicit attribution records yet.</td></tr>:impact.attributionSummary.map((a,i)=><tr key={`${a.campaignId}-${a.actionType}-${i}`} className="border-b last:border-0"><td className="py-3 pr-4 font-medium">{a.campaignName||`Campaign #${a.campaignId ?? "Unassigned"}`}</td><td className="py-3 pr-4">{label(a.actionType)}</td><td className="py-3 pr-4">{a.count}</td><td className="py-3">{a.attributedValue}</td></tr>)}</tbody></table></div></section>
  <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Observed campaign outcomes</h2><p className="mt-1 text-sm text-gray-500">Customer actions linked to campaigns are observations, not attribution.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="py-2 pr-4">Campaign</th><th className="py-2 pr-4">Action</th><th className="py-2 pr-4">Count</th><th className="py-2">Value</th></tr></thead><tbody>{impact.observedCampaignSummary.length===0?<tr><td colSpan={4} className="py-6 text-gray-500">No campaign-linked actions yet.</td></tr>:impact.observedCampaignSummary.map((a,i)=><tr key={`${a.campaignId}-${a.actionType}-${i}`} className="border-b last:border-0"><td className="py-3 pr-4 font-medium">{a.campaignName||`Campaign #${a.campaignId}`}</td><td className="py-3 pr-4">{label(a.actionType)}</td><td className="py-3 pr-4">{a.count}</td><td className="py-3">{a.value}</td></tr>)}</tbody></table></div></section>
 </div>;
}
