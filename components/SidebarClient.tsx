"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";
import { hasFeature } from "@/lib/plans";
import { LayoutDashboard, Upload, FileText, FilePen, Link2, Settings, PanelLeftClose, PanelLeftOpen, X, Crown, Activity, BarChart3, CreditCard, Package, Warehouse, ShoppingBag, Store, Sparkles, Send, Brain, Target } from "lucide-react";

type SidebarSection = { title:string; items:{href:string;label:string;icon:any;premium?:boolean}[] };

export default function SidebarClient({ user, plan, mobileOpen=false, onClose }: { user:{name?:string|null;email?:string|null}; plan:string; mobileOpen?:boolean; onClose?:()=>void }) {
  const pathname=usePathname(); const [collapsed,setCollapsed]=useState(false);
  useEffect(()=>{ const saved=localStorage.getItem("sidebar-collapsed"); if(saved) setCollapsed(JSON.parse(saved)); },[]);
  function toggleSidebar(){ const next=!collapsed; setCollapsed(next); localStorage.setItem("sidebar-collapsed",JSON.stringify(next)); }
  const sections:SidebarSection[]=[
    {title:"COMMAND",items:[{href:"/dashboard",label:"Dashboard",icon:LayoutDashboard}]},
    {title:"AI WORKSPACE",items:[
      {href:"/onboarding",label:"Business Setup",icon:Brain},
      {href:"/ai-strategist",label:"AI Strategist",icon:Sparkles},
      {href:"/generate-week",label:"Generate My Week",icon:Target},
      {href:"/marketing-content",label:"Content Review",icon:Send},
      {href:"/ai-optimizer",label:"Optimizer",icon:Sparkles},
    ]},
    {title:"ASSETS & DISTRIBUTION",items:[
      {href:"/media",label:"Media",icon:Upload},
      {href:"/accounts",label:"Channels & Accounts",icon:Link2},
      {href:"/posts",label:"Posts",icon:FileText},
      {href:"/drafts",label:"Drafts",icon:FilePen},
      {href:"/bulk-upload",label:"Bulk Upload",icon:Upload,premium:!hasFeature(plan,"bulkUpload")},
    ]},
    {title:"COMMERCE",items:[
      {href:"/products",label:"Products",icon:Package},
      {href:"/inventory",label:"Inventory",icon:Warehouse},
      {href:"/orders",label:"Orders",icon:ShoppingBag},
      {href:"/commerce/channels",label:"Channels",icon:Store},
      {href:"/commerce/listings",label:"Listings",icon:Store},
    ]},
    {title:"MEASURE",items:[
      {href:"/business-impact",label:"Business Impact",icon:BarChart3},
      {href:"/analytics",label:"Analytics",icon:BarChart3,premium:!hasFeature(plan,"analytics")},
      {href:"/activity",label:"Activity",icon:Activity},
    ]},
    {title:"ACCOUNT",items:[
      {href:"/settings/billing",label:"Billing",icon:CreditCard},
      {href:"/settings",label:"Settings",icon:Settings},
    ]},
  ];
  return <aside className={`flex h-screen flex-col overflow-hidden border-r border-black/5 bg-[#10121a] text-white transition-all duration-200 lg:relative lg:translate-x-0 ${mobileOpen?"translate-x-0":"-translate-x-full"} lg:flex ${collapsed?"lg:w-20":"lg:w-64"} w-64`}>
    <div className="flex-1 overflow-y-auto p-3">
      <div className="mb-8 flex items-center justify-between px-2 pt-1">
        {!collapsed && <Link href="/dashboard" className="text-2xl font-black tracking-[-.04em]">dizito<span className="text-[#c7f36b]">.</span></Link>}
        <div className="flex gap-1"><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden" aria-label="Close navigation"><X size={18}/></button><button onClick={toggleSidebar} className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:block">{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button></div>
      </div>
      <nav className="space-y-6">
        {sections.map(section=><div key={section.title}>
          {!collapsed && <div className="mb-2 px-2 text-[10px] font-bold tracking-[.16em] text-slate-500">{section.title}</div>}
          <div className="space-y-1">
            {section.items.map(item=>{ const Icon=item.icon; const active=item.href==="/dashboard"?pathname==="/dashboard":pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={()=>onClose?.()} title={collapsed?item.label:undefined} className={`relative flex items-center rounded-xl px-3 py-2.5 text-sm transition ${collapsed?"lg:justify-center":"gap-3"} ${active?"bg-white text-slate-900 shadow-lg shadow-black/10":"text-slate-300 hover:bg-white/7 hover:text-white"}`}>
              <Icon size={18}/>{!collapsed&&<><span className="font-semibold">{item.label}</span>{item.premium&&<span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${active?"bg-slate-100 text-slate-600":"bg-white/10 text-slate-400"}`}><Crown size={10}/>PRO</span>}</>}
            </Link>;})}
          </div>
        </div>)}
      </nav>
    </div>
    {!collapsed&&<div className="px-3 pb-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current plan</div><div className="mt-2 inline-flex rounded-full bg-[#c7f36b] px-2.5 py-1 text-xs font-black text-slate-900">{plan.toUpperCase()}</div>{plan==="free"&&<Link href="/pricing" className="mt-3 block rounded-xl bg-white px-3 py-2 text-center text-xs font-bold text-slate-900">Upgrade plan</Link>}</div></div>}
    <div className="border-t border-white/10 p-3">{!collapsed&&<div className="mb-3 px-2"><div className="truncate text-sm font-bold">{user.name||"Merchant"}</div><div className="truncate text-xs text-slate-500">{user.email}</div></div>}<LogoutButton/></div>
  </aside>;
}
