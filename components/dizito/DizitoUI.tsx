import { ReactNode, ButtonHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, Inbox, Sparkles } from "lucide-react";

export function DizitoPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`dizito-page ${className}`}>{children}</div>;
}

export function DizitoPageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="dizito-page-header">
    <div className="min-w-0">
      {eyebrow && <div className="dizito-eyebrow"><Sparkles size={13} />{eyebrow}</div>}
      <h1 className="dizito-title">{title}</h1>
      {description && <p className="dizito-subtitle">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>;
}

export function DizitoCard({ children, className = "", tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "ai" | "soft" | "dark" }) {
  return <section className={`dizito-card dizito-card-${tone} ${className}`}>{children}</section>;
}

export function DizitoSectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="dizito-section-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

export function DizitoButton({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "ai" | "provider-woocommerce" | "provider-shopify" | "provider-amazon" }) {
  return <button className={`dizito-button dizito-button-${variant} ${className}`} {...props}>{children}</button>;
}

export function DizitoBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "ai" | "info" }) {
  return <span className={`dizito-badge dizito-badge-${tone}`}>{children}</span>;
}

export function DizitoMetric({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return <div className="dizito-metric"><div className="flex items-center justify-between gap-3"><span className="dizito-metric-label">{label}</span>{icon && <span className="dizito-metric-icon">{icon}</span>}</div><div className="dizito-metric-value">{value}</div>{hint && <div className="dizito-metric-hint">{hint}</div>}</div>;
}

export function DizitoState({ kind, title, description, action }: { kind: "empty" | "error" | "success"; title: string; description?: string; action?: ReactNode }) {
  const Icon = kind === "empty" ? Inbox : kind === "error" ? AlertCircle : CheckCircle2;
  return <div className={`dizito-state dizito-state-${kind}`}><Icon size={22}/><div><h3>{title}</h3>{description && <p>{description}</p>}{action && <div className="mt-4">{action}</div>}</div></div>;
}

export function DizitoAiMark() {
  return <span className="dizito-ai-mark"><Sparkles size={13}/>Dizito AI</span>;
}
