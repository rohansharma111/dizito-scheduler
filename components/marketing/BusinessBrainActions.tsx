"use client";

import { FormEvent, useState } from "react";
import { Plus, Tag, Target } from "lucide-react";
import { DizitoButton, DizitoCard } from "@/components/dizito/DizitoUI";

export default function BusinessBrainActions({ onSaved }: { onSaved: () => void }) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>, endpoint:string, payload:Record<string,string>) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json(); if(!response.ok) throw new Error(data.error||"Unable to save");
      event.currentTarget.reset(); onSaved();
    } catch(e){setError(e instanceof Error?e.message:"Unable to save");} finally{setBusy(false);}
  }
  return <div className="grid gap-5 lg:grid-cols-2">
    <DizitoCard tone="soft">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Target size={17}/></span><div><h3 className="font-black">Add a goal</h3><p className="text-xs text-slate-500">Give the Strategist a concrete priority.</p></div></div>
      <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_150px_auto]" onSubmit={e=>submit(e,"/api/marketing/goals",{name:String(new FormData(e.currentTarget).get("name")||""),goalType:String(new FormData(e.currentTarget).get("goalType")||"growth")})}>
        <input name="name" required placeholder="e.g. Increase qualified leads" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
        <select name="goalType" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="growth">Growth</option><option value="leads">Leads</option><option value="sales">Sales</option><option value="engagement">Engagement</option></select>
        <DizitoButton disabled={busy}><Plus size={14}/>Add</DizitoButton>
      </form>
    </DizitoCard>
    <DizitoCard tone="soft">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-teal-700"><Tag size={17}/></span><div><h3 className="font-black">Add an offer</h3><p className="text-xs text-slate-500">Make a promotion available to content generation.</p></div></div>
      <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_150px_auto]" onSubmit={e=>submit(e,"/api/marketing/offers",{name:String(new FormData(e.currentTarget).get("name")||""),offerType:String(new FormData(e.currentTarget).get("offerType")||"promotion")})}>
        <input name="name" required placeholder="e.g. 15% first-order offer" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
        <input name="offerType" defaultValue="promotion" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
        <DizitoButton disabled={busy}><Plus size={14}/>Add</DizitoButton>
      </form>
    </DizitoCard>
    {error&&<div className="lg:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
  </div>;
}
