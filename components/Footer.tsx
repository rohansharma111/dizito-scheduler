import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

const groups = [
  {
    title: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:gap-16">
          <div className="max-w-sm">
            <Link href="/" aria-label="Dizito home" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#171923] text-[#c7f36b]">
                <Sparkles size={18} />
              </span>
              <span className="text-xl font-extrabold tracking-[-0.04em] text-slate-950">Dizito</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-slate-500">Create once. Publish everywhere.</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">A clearer operating rhythm for your content and commerce.</p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="group inline-flex items-center gap-1 text-sm font-semibold text-slate-600 transition hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                      {link.label}<ArrowUpRight size={13} className="opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Contact</h2>
            <a href="mailto:contact@dizito.in" className="mt-4 inline-flex text-sm font-bold text-slate-800 transition hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
              contact@dizito.in
            </a>
            <p className="mt-2 text-xs leading-5 text-slate-400">Questions? We’d love to hear from you.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Dizito. All rights reserved.</span>
          <span>Made for a more intentional way to publish.</span>
        </div>
      </div>
    </footer>
  );
}
