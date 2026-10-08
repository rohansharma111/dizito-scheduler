"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { DizitoCard, DizitoPage, DizitoPageHeader, DizitoState, DizitoBadge } from "@/components/dizito/DizitoUI";

type Attribution={id:number;customerActionId:number;campaignId:number|null;contentItemId:number|null;variantId:number|null;postId:number|null;orderId:number|null;attributionModel:string;attributedValue:number|null;currency:string|null;weight:number|null;note:string|null;createdAt:string};

export default function AttributionClient(){
 const [items,setItems]=useState<Attribution[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 async function load(){try{setError(null);const r=await fetch("/api/marketing/attributions");const d=await r.json();if(!r.ok)throw new Error(d.error||"Failed to load attributions");setItems(d.attributions||[]);}catch(e){setError(e instanceof Error?e.message:"Failed to load attributions");}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 if(loading)return <DizitoPage><DizitoState kind="empty" title="Loading attribution" description="Preparing explicit marketing-to-outcome evidence." /></DizitoPage>;
 return <DizitoPage><DizitoPageHeader eyebrow="Business Impact" title="Attribution" description="Review explicit marketing-to-outcome attribution. Dizito never infers causality here."/>
  {error?<DizitoState kind="error" title="Attribution could not be loaded" description={error}/>:<DizitoCard className="overflow-hidden p-0"><div className="border-b px-5 py-4 md:px-6"><div className="flex items-center gap-2 text-sm text-gray-500"><Link2 size={16}/>Explicit attribution records</div></div>{items.length===0?<div className="p-6"><DizitoState kind="empty" title="No explicit attributions yet" description="Add them through an integration or customer-action workflow when supported."/></div>:<div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-400"><th className="px-5 py-3 md:px-6">Action</th><th className="px-5 py-3">Campaign</th><th className="px-5 py-3">Order</th><th className="px-5 py-3">Value</th><th className="px-5 py-3 md:pr-6">Model</th></tr></thead><tbody>{items.map(a=><tr key={a.id} className="border-b last:border-0"><td className="px-5 py-4 font-medium md:px-6">#{a.customerActionId}</td><td className="px-5 py-4">{a.campaignId?`#${a.campaignId}`:"—"}</td><td className="px-5 py-4">{a.orderId?`#${a.orderId}`:"—"}</td><td className="px-5 py-4">{a.attributedValue==null?"—":`${a.attributedValue} ${a.currency||""}`}</td><td className="px-5 py-4 md:pr-6"><DizitoBadge tone="neutral">{a.attributionModel}</DizitoBadge></td></tr>)}</tbody></table></div>}</DizitoCard></DizitoPage>;
}