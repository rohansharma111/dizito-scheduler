import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { authOptions } from "@/lib/auth";

const features = [
  { icon: Layers3, title: "Social Content Planning", tone: "violet" },
  { icon: Layers3, title: "Campaign & Content Workflow", tone: "cyan" },
  { icon: Layers3, title: "Product Catalog Management", tone: "violet" },
  { icon: Layers3, title: "Commerce Channel Connections", tone: "lime" },
  { icon: Layers3, title: "Publishing & Scheduling", tone: "cyan" },
  { icon: Clapperboard, title: "Bulk CSV Upload", tone: "violet" },
  { icon: Users, title: "Multi Account Support", tone: "lime" },
  { icon: CalendarClock, title: "Calendar Scheduling", tone: "cyan" },
  { icon: RefreshCw, title: "Smart Retry System", tone: "violet" },
  { icon: CheckCircle2, title: "Draft Management", tone: "lime" },
];

const steps = [
  {
    number: "01",
    title: "Connect your business",
    description: "Add your business context, products and the social or commerce channels you currently use.",
  },
  {
    number: "02",
    title: "Plan your marketing",
    description: "Organize campaigns, offers and content in a repeatable weekly workflow. AI-assisted features are coming soon; manual planning remains available.",
  },
  {
    number: "03",
    title: "Review, publish and improve",
    description: "Review content before it goes live, manage supported channel workflows and use available business-impact evidence to guide the next cycle.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const ctaHref = session?.user ? "/dashboard" : "/login";
  const ctaText = session?.user ? "Go to dashboard" : "Start free";

  return (
    <main className="overflow-hidden bg-[#f8f9f6] text-[#171923]">
      <section className="relative isolate px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:pt-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-32 -top-36 size-[30rem] rounded-full bg-[#c7f36b]/25 blur-3xl" />
          <div className="absolute -left-36 top-28 size-[26rem] rounded-full bg-[#6d5dfc]/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/85 px-4 py-2 text-xs font-bold tracking-wide text-violet-700 shadow-sm sm:text-sm">
            <Sparkles size={15} />
            The operating system for modern commerce
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Run your commerce and marketing from one connected workspace.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-xl sm:leading-8">
            Bring your business context, product catalog, marketing workflow and connected sales channels together. Plan campaigns, prepare content, manage product listings and learn what is working—all from one place. AI capabilities are being introduced progressively, with practical manual workflows available today.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={ctaHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c7f36b] px-7 py-3 text-sm font-extrabold text-slate-950 shadow-[0_8px_24px_rgba(159,218,53,0.22)] transition hover:-translate-y-0.5 hover:bg-[#b8e95a]">
              {ctaText}<ArrowRight size={17} />
            </Link>
            <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-7 py-3 text-sm font-bold text-slate-800 transition hover:border-violet-200 hover:bg-violet-50">
              Explore plans
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
            {["No credit card required", "Multi-platform publishing", "Bulk scheduling"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" />{item}</span>
            ))}
          </div>
          <div className="mx-auto mt-14 max-w-5xl rounded-[1.75rem] border border-white bg-white/80 p-3 shadow-[0_28px_90px_rgba(29,34,48,0.10)] sm:mt-16 sm:p-5">
            <div className="rounded-[1.25rem] border border-slate-100 bg-[#f8f9fc] p-5 text-left sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Your publishing calendar</p>
                  <h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">Your week, across every channel.</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" />Schedule at a glance</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">Plan</p>
                  <p className="mt-2 text-lg font-extrabold">Drafts to finish</p>
                  <p className="mt-1 text-sm text-slate-500">Keep upcoming content organized.</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-4">
                  <p className="text-xs font-semibold text-violet-700">Review</p>
                  <p className="mt-2 text-lg font-extrabold">Scheduled posts</p>
                  <p className="mt-1 text-sm text-slate-600">Review content before it goes live.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">Publish</p>
                  <p className="mt-2 text-lg font-extrabold">Published content</p>
                  <p className="mt-1 text-sm text-slate-500">Keep track of what has gone out.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">A quick scheduling walkthrough</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">See how scheduling works.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Take a quick look at creating, reviewing and scheduling posts across your supported channels.</p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(17,24,39,0.09)] sm:p-3">
            <video controls preload="metadata" poster="/uploads/logo.png" className="aspect-video w-full rounded-2xl bg-slate-950 object-contain">
              <source src="/uploads/demo.mp4" type="video/mp4" />
              Your browser does not support the video element.
            </video>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white/75 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">One calendar for your social channels</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {["Instagram", "Facebook", "LinkedIn", "Pinterest", "Google Business"].map((channel) => (
              <span key={channel} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">{channel}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">The Dizito operating loop</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">From business context to better decisions.</h2>
            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">A clear process for doing the work—not another disconnected tool to manage.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { number: "01", title: "Set your foundation", body: "Keep business details, products, offers and media organised." },
              { number: "02", title: "Plan the work", body: "Build campaigns and a weekly content plan using available manual workflows." },
              { number: "03", title: "Review and distribute", body: "Prepare platform-specific content and approve it before publishing." },
              { number: "04", title: "Learn and improve", body: "Review available activity and business-impact evidence to inform the next cycle." },
            ].map((item) => (
              <article key={item.number} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="text-xs font-extrabold tracking-widest text-violet-700">{item.number}</span>
                <h3 className="mt-4 text-lg font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-extrabold text-slate-900">AI, with clear human control</p>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">AI-powered strategy and content generation are marked as coming soon while the no-AI-cost workflow stays usable. Review and approval remain explicit steps—not hidden automation.</p>
              </div>
              <Link href="/how-it-works" className="inline-flex shrink-0 items-center gap-2 text-sm font-extrabold text-violet-700 hover:text-violet-900">Explore the workflow <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">Everything you need to plan and publish</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">Plan, schedule and publish with less busywork.</h2>
            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">Create drafts, schedule content in bulk, manage multiple accounts and keep publishing organized.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, tone }) => (
              <article key={title} className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_6px_24px_rgba(17,24,39,0.035)] transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_38px_rgba(17,24,39,0.08)]">
                <div className={`flex size-12 items-center justify-center rounded-2xl ${tone === "lime" ? "bg-lime-100 text-slate-900" : tone === "cyan" ? "bg-teal-50 text-teal-700" : "bg-violet-50 text-violet-700"}`}><Icon size={22} /></div>
                <h3 className="mt-5 text-lg font-extrabold tracking-tight">{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#171923] px-5 py-20 text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c7f36b]">From draft to published</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">Three simple steps to keep your content moving.</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="rounded-2xl border border-white/10 bg-white/[0.045] p-7 sm:p-8">
                <span className="text-sm font-extrabold tracking-widest text-[#c7f36b]">{step.number}</span>
                <h3 className="mt-5 text-xl font-extrabold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">Made for social media workflows</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Keep every channel on schedule.</h2>
            <p className="mt-5 leading-7 text-slate-600">Whether you publish on your own or coordinate content for a team, Dizito keeps drafts, schedules and channels together in one place.</p>
            <Link href="/how-it-works" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-violet-700 hover:text-violet-900">See how it works <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Sparkles size={21} /></div>
              <h3 className="mt-4 font-extrabold">For creators</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Keep your ideas, drafts and publishing schedule in one place.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex size-11 items-center justify-center rounded-xl bg-lime-100 text-slate-900"><Users size={21} /></div>
              <h3 className="mt-4 font-extrabold">For social teams</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Coordinate channels and content without losing sight of the plan.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2">
              <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ShieldCheck size={21} /></div>
              <h3 className="mt-4 font-extrabold">Review before publishing</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Check your content before it goes live, with a clear review step between drafting and publishing.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 overflow-hidden rounded-[1.75rem] bg-[#c7f36b] px-7 py-10 sm:px-12 sm:py-14 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-700">Get your publishing week organized</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">Build a more organised way to run your business online.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-700 sm:text-base">Connect business context, products, content and supported channels in a workflow designed to grow with your business.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link href={ctaHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#171923] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800">{ctaText}<ArrowRight size={16} /></Link>
            <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-900/20 bg-white/60 px-6 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-white">View pricing</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
