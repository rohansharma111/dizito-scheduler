import { Mail, Clock } from "lucide-react";
import { DizitoCard, DizitoPage, DizitoPageHeader } from "@/components/dizito/DizitoUI";

export default function ContactPage() {
  return (
    <DizitoPage className="max-w-3xl px-4 sm:px-6">
      <DizitoPageHeader
        eyebrow="Support"
        title="Contact Dizito"
        description="Have a question about your workspace, connected channels, or the product? Get in touch."
      />
      <DizitoCard>
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <Mail size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500">Email support</p>
            <a href="mailto:dizito@gmail.com" className="mt-1 block break-all text-lg font-bold text-slate-900 underline decoration-violet-300 underline-offset-4">dizito@gmail.com</a>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Clock size={15} /> Typical response time: 24 hours.</p>
          </div>
        </div>
      </DizitoCard>
    </DizitoPage>
  );
}
