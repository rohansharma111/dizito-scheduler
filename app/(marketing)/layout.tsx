import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import Footer from "@/components/Footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const destination = session?.user ? "/dashboard" : "/login";
  const actionLabel = session?.user ? "Dashboard" : "Get started";

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9f6] text-[#171923]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Dizito home" className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#171923] text-[#c7f36b] transition group-hover:rotate-[-4deg]">
              <Sparkles size={19} strokeWidth={2.3} />
            </span>
            <span className="text-xl font-extrabold tracking-[-0.045em] sm:text-2xl">Dizito</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-3">
            <Link href="/pricing" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex">
              Pricing
            </Link>
            <Link href={destination} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#c7f36b] px-4 py-2 text-sm font-extrabold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#b8e95a] sm:px-5">
              {actionLabel}<ArrowRight size={15} />
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
