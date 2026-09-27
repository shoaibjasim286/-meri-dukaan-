import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { PageHeader, Panel, Pill } from "@/components/dukaan/primitives";
import { PERMISSION_KEYS, type StaffRole } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff — DukaanFlow" },
      { name: "description", content: "Staff profiles, roles aur permissions manage karein." },
      { property: "og:title", content: "Staff — DukaanFlow" },
      { property: "og:description", content: "Owner, manager, cashier ke alag ikhtiyarat." },
    ],
  }),
  component: StaffPage,
});

const ROLES: StaffRole[] = ["Owner", "Manager", "Cashier", "Sales Staff"];

function StaffPage() {
  const { staff, updateStaff, addStaff, currentStaff } = useStore();
  const canManageStaff = hasPermission(currentStaff, "staff.manage");
  const [selectedId, setSelectedId] = useState(staff[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Cashier" as StaffRole, pin: "" });

  const selected = staff.find((s) => s.id === selectedId) ?? staff[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff"
        subtitle="Team aur unke ikhtiyarat"
        actions={
          <Button className="h-11 rounded-xl font-bold" disabled={!canManageStaff} title={!canManageStaff ? "Aapko ye permission nahi hai" : undefined} onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Naya Staff
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_1.2fr]">
        <Panel title="Team" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {staff.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <UserRound className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">{s.role}</span>
                  </span>
                  <Pill tone={s.active ? "success" : "muted"}>{s.active ? "Active" : "Band"}</Pill>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {selected ? (
          <Panel title={`Permissions — ${selected.name}`}>
            <div className="mb-4 flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
              <span className="text-sm font-bold">Account Active</span>
              <Switch
                checked={selected.active}
                onCheckedChange={(v) => updateStaff(selected.id, { active: v })}
              />
            </div>
            <ul className="space-y-2">
              {PERMISSION_KEYS.map((k) => (
                <li key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                  <span className="min-w-0 truncate text-sm font-semibold">{k}</span>
                  <Switch
                    checked={!!selected.permissions[k]}
                    disabled={!canManageStaff || selected.role === "Owner"} title={!canManageStaff ? "Aapko ye permission nahi hai" : undefined}
                    onCheckedChange={(v) =>
                      updateStaff(selected.id, {
                        permissions: { ...selected.permissions, [k]: v },
                      })
                    }
                  />
                </li>
              ))}
            </ul>
            {selected.role === "Owner" ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Owner ke paas sab ikhtiyarat hamesha hote hain.
              </p>
            ) : null}
          </Panel>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naya Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Naam</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="min-w-0">
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as StaffRole })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">4-digit PIN</Label>
              <Input
                className="mt-1"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={form.pin}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setForm({ ...form, pin: digits });
                }}
              />
              {form.pin.length > 0 && form.pin.length !== 4 ? (
                <p className="mt-1 text-xs text-danger">
                  PIN exactly 4 digit ka hona chahiye
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || form.pin.length !== 4}
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error("Naam zaroori hai");
                  return;
                }
                if (form.pin.length !== 4) {
                  toast.error("PIN exactly 4 digit ka hona chahiye");
                  return;
                }
                addStaff(form);
                setForm({ name: "", role: "Cashier", pin: "" });
                setOpen(false);
                toast.success("Staff add ho gaya");
              }}
            >
              Save Karein
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
