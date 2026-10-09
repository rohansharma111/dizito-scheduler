"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, CheckCircle2, Link2, Package, Sparkles } from "lucide-react";
import { DizitoBadge, DizitoButton, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";

type Progress={connectedAccounts:number;postsCreated:number;postsScheduled:number};
export default function OnboardingPage(){
 const [progress,setProgress]=useState<Progress>({connectedAccounts:0,postsCreated:0,postsScheduled:0}); const [brain,setBrain]=useState<any>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{Promise.all([fetch("/api/onboarding").then(r=>r.json()),fetch("/api/marketing/business-brain").then(r=>r.json())]).then(([p,b])=>{setProgress(p);setBrain(b.businessBrain||null)}).catch(e=>setError(e instanceof Error?e.message:"Unable to load setup")).finally(()=>setLoading(false));},[]);
 const steps=[
  {done:Boolean(brain?.profile),title:"Define your Business Brain",description:"Give Dizito the business identity and context it should use for every recommendation.",href:"/business-brain",icon:Brain},
  {done:(brain?.goals?.length||0)>0||Boolean(progress.postsCreated),title:"Add goals, products & offers",description:"Connect the commercial context that makes weekly recommendations concrete.",href:"/products",icon:Package},
  {done:progress.connectedAccounts>0,title:"Connect a distribution channel",description:"Choose where approved content should be published.",href:"/accounts",icon:Link2},
  {done:progress.postsCreated>0,title:"Create and review content",description:"Generate a weekly plan and keep human review in the loop.",href:"/generate-week",icon:Sparkles},
 ];
 const done=steps.filter(s=>s.done).length;
 if(loading)return <DizitoPage><DizitoPageHeader eyebrow="Business setup" title="Set up Dizito" description="Loading your setup status."/><DizitoCard><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/></DizitoCard></DizitoPage>;
 return <DizitoPage>
  <DizitoPageHeader eyebrow="Business setup" title="Build the context that makes AI useful." description="Dizito gets better when it understands your business, your goals, your assets and where you want to show up." action={<DizitoBadge tone={done===steps.length?"success":"ai"}>{done}/{steps.length} ready</DizitoBadge>}/>
  {error&&<DizitoState kind="error" title="Setup status unavailable" description={error}/>}
  <DizitoCard tone="ai" className="mb-5"><div className="flex flex-col gap-4 md:flex-row md:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[#c7f36b]"><Sparkles size={21}/></div><div className="min-w-0 flex-1"><h2 className="text-lg font-black">Your setup should end in a useful weekly loop.</h2><p className="mt-1 text-sm leading-6 text-slate-600">Once the basics are ready, let the Strategist turn them into a plan you can review and approve.</p></div><Link href="/generate-week"><DizitoButton>Generate a week <ArrowRight size={15}/></DizitoButton></Link></div></DizitoCard>
  <div className="grid gap-3">{steps.map((step,index)=>{const Icon=step.icon;return <DizitoCard key={step.title} className="!p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${step.done?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{step.done?<CheckCircle2 size={20}/>:<Icon size={19}/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step {index+1}</span>{step.done&&<DizitoBadge tone="success">Ready</DizitoBadge>}</div><h2 className="mt-1 text-sm font-black">{step.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p></div><Link href={step.href} className="self-start sm:self-auto"><DizitoButton variant={step.done?"ghost":"secondary"}>{step.done?"Review":"Open"} <ArrowRight size={14}/></DizitoButton></Link></div></DizitoCard>})}</div>
  {done===steps.length&&<DizitoCard tone="soft" className="mt-5"><div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-600"/><div><div className="font-black">Dizito is ready for the weekly loop.</div><div className="text-sm text-slate-500">Move into Strategy or generate this week directly.</div></div><Link href="/ai-strategist" className="ml-auto text-sm font-bold text-violet-700">Open Strategist →</Link></div></DizitoCard>}
 </DizitoPage>;
}
