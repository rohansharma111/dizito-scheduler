"use client";

import { useEffect, useState } from "react";
import { DizitoBadge, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState, DizitoButton } from "@/components/dizito/DizitoUI";

type ConnectedAccount={id:number;platform:string;account_name:string;status:string};
type CommerceChannel={id:string|number;provider:string;name:string;status:string;external_account_id?:string|null;created_at?:string};
type SettingsResponse={account:{id:number;name:string;email:string};subscription:{plan:string;status:string;subscriptionId:string|null;currentPeriodStart:string|null;currentPeriodEnd:string|null;trialEnd:string|null;cancelAtPeriodEnd:boolean};connectedAccounts:ConnectedAccount[];commerceChannels:CommerceChannel[];preferences:{emailNotifications:boolean;publishSuccess:boolean;publishFailure:boolean}};

export default function SettingsPage(){
 const [settings,setSettings]=useState<SettingsResponse|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState<string|null>(null);
 async function loadSettings(){
  setLoading(true);setLoadError(null);
  try{const r=await fetch("/api/settings");const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load settings");if(!d.account||!d.subscription||!Array.isArray(d.connectedAccounts)||!Array.isArray(d.commerceChannels)||!d.preferences)throw new Error("Unexpected settings response");setSettings(d);}
  catch(error){setLoadError(error instanceof Error?error.message:"Unable to load settings");setSettings(null);}
  finally{setLoading(false);}
 }
 useEffect(()=>{void loadSettings();},[]);
 if(loading)return <DizitoPage><DizitoPageHeader eyebrow="Account" title="Settings" description="Preparing your account configuration."/><DizitoCard><div role="status" className="animate-pulse text-sm text-slate-500">Loading settings…</div></DizitoCard></DizitoPage>;
 if(!settings)return <DizitoPage><DizitoPageHeader eyebrow="Account" title="Settings" description="Manage your account and connected distribution identities."/><DizitoState kind="error" title="Settings could not be loaded" description={loadError||"We could not retrieve your account settings. Refresh and try again."} action={<DizitoButton variant="secondary" onClick={()=>void loadSettings()}>Try again</DizitoButton>}/></DizitoPage>;
 const s=settings.subscription,plan=s.plan;
 const statusTone=s.status==="active"?"success":s.status==="trialing"?"ai":s.status==="past_due"||s.status==="cancelled"?"warning":"neutral";
 return <DizitoPage>
  <DizitoPageHeader eyebrow="Workspace" title="Settings" description="Manage your account details and jump to the settings that control your channels and subscription."/>
  <div className="grid gap-4 lg:grid-cols-2">
   <DizitoCard className="p-5 md:p-6">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Account details</h2><p className="mt-1 text-sm leading-5 text-slate-500">The name and email currently associated with your Dizito login.</p></div><span className="rounded-xl bg-slate-100 p-2 text-xs font-semibold text-slate-600">Profile</span></div>
    <dl className="mt-5 space-y-4"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{settings.account.name || "Not provided"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt><dd className="mt-1 break-all text-sm font-medium text-slate-800">{settings.account.email}</dd></div></dl>
    <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Profile editing and password management are not available here yet.</p>
   </DizitoCard>
   <DizitoCard className="p-5 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Subscription overview</h2><p className="mt-1 text-sm leading-5 text-slate-500">A quick summary. Usage, invoices, and plan changes live in Billing.</p></div><DizitoBadge tone={statusTone}>{s.status.replaceAll("_"," ")}</DizitoBadge></div>
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current plan</div><div className="mt-1 text-xl font-bold capitalize text-slate-900">{plan==="creator"?"Creator":plan||"Free"}</div>{s.cancelAtPeriodEnd&&<p className="mt-2 text-xs text-amber-800">Cancellation scheduled at period end.</p>}{s.trialEnd&&<p className="mt-2 text-xs text-slate-600">Trial ends {new Date(s.trialEnd).toLocaleDateString()}.</p>}</div>
    <a href="/settings/billing" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#c5f36b] px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-[#b8eb52]">Manage billing and plan <span className="ml-2" aria-hidden="true">→</span></a>
   </DizitoCard>
   <DizitoCard className="p-5 md:p-6">
    <h2 className="text-lg font-semibold text-slate-900">Social accounts</h2><p className="mt-1 text-sm leading-5 text-slate-500">Manage connections used for social publishing. Reconnect accounts or review their authorization status on the accounts page.</p>
    <div className="mt-4 flex items-center gap-3"><div className="rounded-xl bg-slate-100 px-4 py-3"><div className="text-2xl font-bold text-slate-900">{settings.connectedAccounts.filter(a=>a.status==="connected").length}</div><div className="text-xs text-slate-500">Connected</div></div><div className="text-sm text-slate-600">of {settings.connectedAccounts.length} listed accounts</div></div>
    {settings.connectedAccounts.length>0&&<div className="mt-4 space-y-2">{settings.connectedAccounts.slice(0,3).map(a=><div key={a.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"><div className="min-w-0"><div className="truncate text-sm font-medium capitalize text-slate-800">{a.platform}</div><div className="truncate text-xs text-slate-500">{a.account_name}</div></div><DizitoBadge tone={a.status==="connected"?"success":"warning"}>{a.status}</DizitoBadge></div>)}</div>}
    <a href="/accounts" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Open social accounts <span className="ml-2" aria-hidden="true">→</span></a>
   </DizitoCard>
   <DizitoCard className="p-5 md:p-6">
    <h2 className="text-lg font-semibold text-slate-900">Commerce stores</h2><p className="mt-1 text-sm leading-5 text-slate-500">Manage the stores and marketplaces where your products can be listed or synced. A saved connection does not necessarily mean publishing access is currently verified.</p>
    <div className="mt-4 flex items-center gap-3"><div className="rounded-xl bg-slate-100 px-4 py-3"><div className="text-2xl font-bold text-slate-900">{settings.commerceChannels.length}</div><div className="text-xs text-slate-500">Store connections</div></div><div className="text-sm text-slate-600">across commerce providers</div></div>
    {settings.commerceChannels.length>0?<div className="mt-4 space-y-2">{settings.commerceChannels.slice(0,3).map((channel)=><div key={channel.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"><div className="min-w-0"><div className="truncate text-sm font-medium text-slate-800">{channel.name||channel.provider}</div><div className="truncate text-xs capitalize text-slate-500">{channel.provider.replaceAll("_"," ")}</div></div><DizitoBadge tone={["active","connected","verified"].includes(channel.status.toLowerCase())?"success":"warning"}>{channel.status.replaceAll("_"," ")}</DizitoBadge></div>)}</div>:<div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4"><p className="text-sm font-medium text-slate-800">No commerce stores connected</p><p className="mt-1 text-xs leading-5 text-slate-500">Connect Shopify or WooCommerce, or set up a supported marketplace, to manage product listings from Dizito.</p></div>}
    <a href="/commerce/channels" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Manage commerce connections <span className="ml-2" aria-hidden="true">→</span></a>
   </DizitoCard>
   <DizitoCard className="p-5 md:p-6">
    <h2 className="text-lg font-semibold text-slate-900">Notification preferences</h2><p className="mt-1 text-sm leading-5 text-slate-500">Notification controls are not configurable yet. The current API returns default values rather than saved preferences, so we don't show misleading On/Off switches here.</p>
    <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4"><div className="text-sm font-semibold text-violet-950">Coming later</div><p className="mt-1 text-sm leading-5 text-violet-900">Choose whether to receive email notifications and publishing success or failure updates once notification preferences are persisted.</p></div>
   </DizitoCard>
  </div>
 </DizitoPage>;
}