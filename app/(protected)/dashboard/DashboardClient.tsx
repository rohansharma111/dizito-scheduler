"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle, Link2, Sparkles, TrendingUp, XCircle } from "lucide-react";
import PostCalendar from "@/components/PostCalendar";
import CreatePostForm from "@/components/CreatePostForm";
import { Post } from "@/types";
import { DizitoAiMark, DizitoBadge, DizitoCard, DizitoMetric, DizitoPage, DizitoPageHeader, DizitoSectionHeader, DizitoState, DizitoButton } from "@/components/dizito/DizitoUI";

export default function DashboardPage() {
  const [posts,setPosts]=useState<Post[]>([]);
  const [stats,setStats]=useState({scheduled:0,published:0,failed:0,accounts:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  async function loadPosts(){ const response=await fetch("/api/posts"); if(!response.ok) throw new Error("Unable to load scheduled posts"); const data=await response.json(); setPosts(data); }
  async function loadStats(){ const response=await fetch("/api/dashboard/stats"); if(!response.ok) throw new Error("Unable to load dashboard metrics"); const data=await response.json(); setStats(data); }

  useEffect(()=>{ Promise.all([loadPosts(),loadStats()]).catch(e=>setError(e instanceof Error?e.message:"Unable to load dashboard")).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ const interval=setInterval(()=>{loadPosts().catch(()=>undefined)},10000); return()=>clearInterval(interval); },[]);

  const successRate=stats.published+stats.failed>0?Math.round(stats.published/(stats.published+stats.failed)*100):100;

  return <DizitoPage>
    <DizitoPageHeader eyebrow="Dizito command center" title="Good business deserves momentum." description="See what is happening, decide what matters next, and keep your weekly marketing loop moving." action={<Link href="/generate-week"><DizitoButton><Sparkles size={16}/>Generate My Week</DizitoButton></Link>}/>
    {error&&<DizitoState kind="error" title="Dashboard needs attention" description={error} action={<DizitoButton variant="secondary" onClick={()=>location.reload()}>Retry</DizitoButton>}/>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <DizitoMetric label="Scheduled" value={stats.scheduled} hint="Posts queued" icon={<CalendarClock size={17}/>}/>
      <DizitoMetric label="Published" value={stats.published} hint="Delivered posts" icon={<CheckCircle size={17}/>}/>
      <DizitoMetric label="Failed" value={stats.failed} hint="Needs recovery" icon={<XCircle size={17}/>}/>
      <DizitoMetric label="Channels" value={stats.accounts} hint="Connected accounts" icon={<Link2 size={17}/>}/>
      <DizitoMetric label="Delivery health" value={`${successRate}%`} hint="Published vs failed" icon={<TrendingUp size={17}/>}/>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <DizitoCard>
        <DizitoSectionHeader title="Your operating loop" description="The shortest path from business context to measurable customer action."/>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["/onboarding","1","Business Brain","Set the context Dizito should understand."],
            ["/ai-strategist","2","Strategy","Turn context and evidence into priorities."],
            ["/generate-week","3","Weekly plan","Generate a reviewable plan for the week."],
            ["/marketing-content","4","Review & publish","Approve, tailor by channel, then schedule."],
            ["/business-impact","5","Business Impact","See observed customer actions and attribution."],
            ["/ai-optimizer","6","Optimize","Turn evidence into the next experiment."],
          ].map(([href,n,label,desc])=><Link key={href} href={href} className="group flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">{n}</span>
            <span><span className="block text-sm font800 font-bold text-slate-900">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span></span><ArrowRight size={15} className="ml-auto mt-1 text-slate-300 transition group-hover:text-violet-500"/>
          </Link>)}
        </div>
      </DizitoCard>
      <DizitoCard tone="ai">
        <div className="flex items-center justify-between"><DizitoAiMark/><DizitoBadge tone="ai">Human controlled</DizitoBadge></div>
        <h2 className="mt-4 text-xl font-black tracking-tight">The AI works for the business, not the other way around.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Dizito grounds recommendations in your business context, keeps generated content reviewable, and separates observed outcomes from causal claims.</p>
        <Link href="/ai-strategist" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700">Open Strategist <ArrowRight size={15}/></Link>
      </DizitoCard>
    </div>

    <div className="mt-5">
      <DizitoCard>
        <DizitoSectionHeader title="Publishing calendar" description={loading?"Loading your publishing activity…":"Your existing scheduler remains the delivery engine."}/>
        {loading?<div className="h-48 animate-pulse rounded-2xl bg-slate-100"/>:posts.length===0?<DizitoState kind="empty" title="Nothing scheduled yet" description="Generate a weekly plan or create a post to start your publishing rhythm." action={<Link href="/generate-week"><DizitoButton><Sparkles size={15}/>Start the week</DizitoButton></Link>}/>:<PostCalendar posts={posts}/>}
      </DizitoCard>
    </div>

    <div className="mt-5">
      <DizitoCard>
        <DizitoSectionHeader title="Quick publish" description="For one-off posts outside the AI weekly loop."/>
        <CreatePostForm posts={posts} setPosts={setPosts}/>
      </DizitoCard>
    </div>
  </DizitoPage>;
}
