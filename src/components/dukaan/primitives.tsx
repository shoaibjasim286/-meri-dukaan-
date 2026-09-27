import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("surface-card overflow-hidden", className)}>
      {title ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="truncate text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const toneMap = {
  primary: "bg-primary-soft text-primary",
  teal: "bg-teal-soft text-teal",
  amber: "bg-amber-soft text-amber-foreground",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  muted: "bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof toneMap;

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
  to,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: Tone;
  to?: string;
}) {
  const body = (
    <div className="surface-card h-full p-4 transition-shadow hover:shadow-float sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", toneMap[tone])}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="num-lg mt-3 text-2xl sm:text-[1.7rem]">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function StatCard({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className={cn("rounded-xl px-4 py-3", toneMap[tone])}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="num-lg mt-1 text-lg">{value}</p>
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  right,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-xl pl-9"
        />
      </div>
      {right}
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
            value === opt
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold",
        toneMap[tone],
      )}
    >
      {children}
    </span>
  );
}

export function QuickAction({
  label,
  icon: Icon,
  to,
  onClick,
  tone = "primary",
}: {
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
  tone?: Tone;
}) {
  const inner = (
    <>
      <span className={cn("grid size-11 place-items-center rounded-xl", toneMap[tone])}>
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-bold">{label}</span>
    </>
  );
  const cls =
    "surface-card flex w-full flex-col items-center gap-2 px-2 py-4 text-center transition-shadow hover:shadow-float";
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function PrimaryButton(props: React.ComponentProps<typeof Button>) {
  return <Button {...props} className={cn("h-12 rounded-xl text-base font-bold", props.className)} />;
}
