import { useEffect, useState } from "react";
import { Delete, Lock, Store, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getRemainingLockoutSeconds } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function LockScreen() {
  const { staff, settings, signInStaff } = useStore();
  const activeStaff = staff.filter((s) => s.active);
  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const person = activeStaff.find((s) => s.id === selected);

  useEffect(() => {
    if (!person) {
      setLockoutSeconds(0);
      return;
    }

    const update = () => {
      setLockoutSeconds(getRemainingLockoutSeconds(person.id));
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [person?.id]);

  const verify = async (candidate: string) => {
    if (!person || candidate.length !== 4 || loading || lockoutSeconds > 0) return;

    setLoading(true);
    setError("");

    const result = await signInStaff(person.id, candidate);

    setLoading(false);

    if (!result.ok) {
      setLockoutSeconds(getRemainingLockoutSeconds(person.id));
      setError(result.error);
      setTimeout(() => setPin(""), 350);
      return;
    }

    setLockoutSeconds(0);
    setPin("");
  };

  const press = (d: string) => {
    if (pin.length >= 4 || loading || lockoutSeconds > 0) return;
    const next = pin + d;
    setPin(next);
    setError("");

    if (next.length === 4) {
      void verify(next);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar px-5 py-10 text-sidebar-foreground">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Store className="size-6" />
        </span>
        <div>
          <p className="text-2xl font-extrabold tracking-tight">DukaanFlow</p>
          <p className="text-sm opacity-70">{settings.storeName}</p>
        </div>
      </div>

      {!person ? (
        <div className="mt-10 w-full max-w-sm">
          <p className="mb-3 text-center text-sm opacity-80">Apna naam chunein</p>
          <div className="space-y-2">
            {activeStaff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelected(s.id);
                  setPin("");
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-sidebar-accent px-4 py-3.5 text-left transition-colors hover:bg-sidebar-primary/40"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary/30">
                  <UserRound className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{s.name}</span>
                  <span className="block text-xs opacity-70">{s.role}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-10 w-full max-w-xs">
          <p className="text-center text-sm opacity-80">
            {person.name} — {person.role}
          </p>
          <p className="mt-1 text-center text-lg font-bold">Apna PIN dalo</p>

          <div className="mt-6 flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "size-4 rounded-full border-2 border-sidebar-border",
                  pin.length > i && "border-sidebar-primary bg-sidebar-primary",
                )}
              />
            ))}
          </div>
          <p className="mt-3 min-h-5 text-center text-xs text-danger">{error}</p>
          {lockoutSeconds > 0 ? (
            <p className="mt-1 text-center text-sm font-bold text-danger">
              Locked: {lockoutSeconds}s
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-3 opacity-100 disabled:opacity-50">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <KeyBtn key={d} onClick={() => press(d)}>
                {d}
              </KeyBtn>
            ))}
            <KeyBtn onClick={() => setPin("")}>
              <span className="text-sm font-semibold">Clear</span>
            </KeyBtn>
            <KeyBtn onClick={() => press("0")}>0</KeyBtn>
            <KeyBtn onClick={() => setPin((p) => p.slice(0, -1))}>
              <Delete className="size-5" />
            </KeyBtn>
          </div>

          <Button
            className="mt-5 h-12 w-full rounded-xl text-base font-bold"
            disabled={pin.length !== 4 || loading || lockoutSeconds > 0}
            onClick={() => {
              void verify(pin);
            }}
          >
            <Lock className="size-4" /> {loading ? "Checking..." : "Unlock"}
          </Button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setSelected(null)}
            className="mt-3 w-full text-center text-sm opacity-70 hover:opacity-100"
          >
            Dusra staff chunein
          </button>
        </div>
      )}
    </div>
  );
}

function KeyBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-14 place-items-center rounded-2xl bg-sidebar-accent text-xl font-bold transition-colors hover:bg-sidebar-primary/40 active:scale-95"
    >
      {children}
    </button>
  );
}
