import { ArrowRight, CheckCircle2, Layers3, CalendarDays, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { DizitoCard, DizitoPage, DizitoPageHeader } from "@/components/dizito/DizitoUI";

const steps = [
  { title: "Set up your business context", description: "Add your business details, products, offers, and goals so recommendations have useful context.", icon: Layers3, status: "Available" },
  { title: "Connect supported channels", description: "Connect social accounts and commerce channels where the required provider access and permissions are available.", icon: Users, status: "Provider-dependent" },
  { title: "Plan and create content", description: "Use the Strategist and weekly planning workflow to prepare ideas and channel-aware content for review.", icon: Sparkles, status: "Available" },
  { title: "Review before distribution", description: "Inspect generated copy and variants, then approve the content you want to move forward.", icon: CheckCircle2, status: "Human review" },
  { title: "Schedule and measure", description: "Schedule supported posts, monitor customer actions and business impact, and use observed evidence to inform future planning.", icon: CalendarDays, status: "Channel-dependent" },
];

export default function HowItWorksPage() {
  return (
    <DizitoPage className="max-w-5xl px-4 sm:px-6">
      <DizitoPageHeader eyebrow="The Dizito workflow" title="From business context to better decisions" description="A connected workflow for planning, reviewing, distributing, and learning from your marketing activity." />
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <DizitoCard key={step.title}>
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Icon size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-violet-700">Step {index + 1}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{step.status}</span>
                  </div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && <ArrowRight className="mt-3 hidden shrink-0 text-slate-300 sm:block" size={18} />}
              </div>
            </DizitoCard>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/pricing" className="dizito-button dizito-button-primary">Explore plans</Link>
        <Link href="/login" className="dizito-button dizito-button-secondary">Get started</Link>
      </div>
    </DizitoPage>
  );
}
