import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Plus,
  Store,
  Moon,
  Sun,
} from "lucide-react";
import { mainNav, moreNav, type NavItem } from "./nav";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatToday } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LockScreen } from "./lock-screen";

const mobileNav = ["/", "/samaan", "/bikri", "/udhaar"]
  .map((to) => mainNav.find((n) => n.to === to)!)
  .filter(Boolean);

export function AppShell({ children }: { children: ReactNode }) {
  const { locked } = useStore();
  if (locked) return <LockScreen />;
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar />
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-1">
      {items.map((n) => {
        const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-float"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <n.icon className="size-4.5 shrink-0" />
            <span className="min-w-0 truncate">{n.label}</span>
            {n.hint ? (
              <span className="ml-auto shrink-0 text-[10px] uppercase opacity-60">
                {n.hint}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { settings, currentStaff, setLocked } = useStore();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 py-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Store className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold tracking-tight">DukaanFlow</p>
          <p className="truncate text-xs opacity-60">Dukaan ka poora hisaab</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <NavLinks items={mainNav} onNavigate={onNavigate} />
        <p className="px-3 pb-2 pt-5 text-[11px] font-bold uppercase tracking-wider opacity-50">
          Zyada
        </p>
        <NavLinks items={moreNav} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-xl bg-sidebar-accent px-3 py-2.5">
          <p className="truncate text-sm font-bold">{settings.storeName}</p>
          <p className="truncate text-xs opacity-70">
            {currentStaff.name} — {currentStaff.role}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            setLocked(true);
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold opacity-80 transition-colors hover:bg-sidebar-accent hover:opacity-100"
        >
          <LockKeyhole className="size-4" /> Lock App
        </button>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
      <SidebarBody />
    </aside>
  );
}

function TopBar() {
  const { settings, notifications, updateSettings } = useStore();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(formatToday());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setToday(formatToday());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);
  const unread = notifications.filter((n) => !n.read).length;
  const dark = settings.theme === "dark";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-0 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 lg:col-start-2">
          <p className="truncate text-sm font-bold">{settings.storeName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {today} · Aaj ka hisaab
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Theme"
            onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}
          >
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <Link
            to="/notifications"
            className="relative grid size-9 place-items-center rounded-md hover:bg-muted"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-danger text-[10px] font-bold text-danger-foreground">
                {unread}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <>
      <Link
        to="/bikri"
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-float lg:hidden"
      >
        <Plus className="size-5" /> Quick Sale
      </Link>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {mobileNav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <n.icon className="size-5" />
                {n.label}
              </Link>
            );
          })}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-muted-foreground"
              >
                <MoreHorizontal className="size-5" />
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Sab Modules</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-3 p-4 pb-8">
                {[...mainNav, ...moreNav].map((n) => (
                  <Link
                    key={n.to + n.label}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="surface-card flex flex-col items-center gap-2 px-2 py-4 text-center text-xs font-bold"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                      <n.icon className="size-5" />
                    </span>
                    {n.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
