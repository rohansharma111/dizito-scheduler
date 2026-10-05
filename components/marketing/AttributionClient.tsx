"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2 } from "lucide-react";

type Attribution = { id:number; customerActionId:number; campaignId:number|null; contentItemId:number|null; variantId:number|null; postId:number|null; orderId:number|null; attributionModel:string; attributedValue:number|null; currency:string|null; weight:number|null; note:string|null; createdAt:string };

export default function AttributionClient(){
 const [items,setItems]=useState<Attribution[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{fetch("/api/marketing/attributions").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Failed to load attributions");setItems(d.attributions||[])}).catch(e=>setError(e instanceof Error?e.message:"Failed to load attributions")).finally(()=>setLoading(false));},[]);
 if(loading)return <div className="py-16 text-center text-gray-500"><Loader2 className="mx-auto animate-spin" size={20}/><div className="mt-2">Loading attribution...</div></div>;
 if(error)return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
 return <div className="mx-auto max-w-6xl space-y-6">
  <header className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-gray-100 p-3"><Link2 size={22}/></div><div><h1 className="text-2xl font-bold text-gray-900">Attribution</h1><p className="mt-1 text-sm text-gray-500">Review explicit marketing-to-outcome attribution. Dizito never infers causality here.</p></div></div></header>
  <section className="rounded-2xl border bg-white p-6 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="py-2 pr-4">Action</th><th className="py-2 pr-4">Campaign</th><th className="py-2 pr-4">Order</th><th className="py-2 pr-4">Value</th><th className="py-2">Model</th></tr></thead><tbody>{items.length===0?<tr><td colSpan={5} className="py-8 text-gray-500">No explicit attributions yet. Add them from an integration or customer-action workflow.</td></tr>:items.map(a=><tr key={a.id} className="border-b last:border-0"><td className="py-3 pr-4">#{a.customerActionId}</td><td className="py-3 pr-4">{a.campaignId?`#${a.campaignId}`:"—"}</td><td className="py-3 pr-4">{a.orderId?`#${a.orderId}`:"—"}</td><td className="py-3 pr-4">{a.attributedValue==null?"—":`${a.attributedValue} ${a.currency||""}`}</td><td className="py-3">{a.attributionModel}</td></tr>)}</tbody></table></div></section>
 </div>;
}
