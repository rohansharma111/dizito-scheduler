"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Brain, CalendarDays, CheckCircle2, ClipboardList, Package, Send, Store, BarChart3, Sparkles } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Set up your business",
    description: "Add your business details, goals, products and offers. This gives your marketing work useful context.",
    href: "/business-brain",
    action: "Review business setup",
    icon: Brain,
    detail: "Start here if this is your first visit.",
  },
  {
    number: "02",
    title: "Plan this week",
    description: "Create a practical weekly plan using your saved business information. You can edit the plan before approving it.",
    href: "/generate-week",
    action: "Create a weekly plan",
    icon: CalendarDays,
    detail: "Manual planning is available; AI generation is coming soon.",
  },
  {
    number: "03",
    title: "Review your content",
    description: "Check campaign ideas and content, make changes, and keep approval separate from publishing.",
    href: "/marketing-content",
    action: "Open content review",
    icon: ClipboardList,
    detail: "Nothing should publish just because a plan is approved.",
  },
  {
    number: "04",
    title: "Connect and publish",
    description: "Check connected social accounts, prepare posts and manage commerce listings through the channels currently available to you.",
    href: "/accounts",
    action: "Check connected channels",
    icon: Send,
    detail: "Provider access and publishing readiness vary by channel.",
  },
  {
    number: "05",
    title: "Learn what is working",
    description: "Review activity, customer actions and available business-impact evidence. Use what you learn to plan the next cycle.",
    href: "/business-impact",
    action: "Review business impact",
    icon: BarChart3,
    detail: "Treat observed results and manually attributed outcomes as different kinds of evidence.",
  },
];

const shortcuts = [
  { title: "Products and inventory", description: "Manage your catalog and stock.", href: "/products", icon: Package },
  { title: "Commerce channels", description: "Manage store connections and listings.", href: "/commerce/channels", icon: Store },
  { title: "Learn how to use Dizito", description: "Read the step-by-step product guide.", href: "/how-it-works", icon: BookOpen },
];

export default function MarketingWorkspacePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <header className="rounded-3xl bg-[#171923] px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c7f36b]">Your guided workspace</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Know what to do next.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
          Dizito brings your business context, marketing planning, content review, publishing and results into one workflow. Follow these steps in order the first time. After setup, return here whenever you need a clear next action.
        </p>
        <Link href="/business-brain" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c7f36b] px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-[#b8e95a]">
          Start with your business setup <ArrowRight size={17} />
        </Link>
      </header>

      <section aria-labelledby="workflow-title">
        <div className="mb-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700">The recommended path</p>
          <h2 id="workflow-title" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">From setup to better decisions</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">You do not need to learn every menu. Start at step 1 and move forward when each step is useful for your business.</p>
        </div>
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.number} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Icon size={22} /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold tracking-wider text-violet-700">STEP {step.number}</span>
                    <h3 className="text-base font-extrabold text-slate-900">{step.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{step.detail}</p>
                </div>
                <Link href={step.href} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-violet-200 hover:bg-violet-50 sm:shrink-0">
                  {step.action} <ArrowRight size={15} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700"><Sparkles size={20} /></div>
          <div>
            <h2 className="font-extrabold text-slate-900">AI is an enhancement, not a blocker</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">AI-powered strategy and copy generation are coming soon while AI spending is disabled. You can still organise business information, build a deterministic weekly plan, edit content, review it, schedule supported posts and inspect available results.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="text-xl font-extrabold tracking-tight text-slate-900">Go directly to a task</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-200 hover:shadow-sm">
                <Icon size={21} className="text-violet-700" />
                <h3 className="mt-4 font-extrabold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-700">Open <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
