import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { PageHeader, Panel } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DukaanFlow" },
      { name: "description", content: "Store profile, theme, PIN lock, receipt aur backup settings." },
      { property: "og:title", content: "Settings — DukaanFlow" },
      { property: "og:description", content: "Apni dukaan ke mutabiq app set karein." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, resetData, setLocked } = useStore();
  const [confirm, setConfirm] = useState<null | "reset" | "restore">(null);

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="App aur dukaan ki settings" />

      <Panel title="Store Profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Store Name</Label>
            <Input className="mt-1" value={settings.storeName} onChange={(e) => updateSettings({ storeName: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input className="mt-1" value={settings.phone} onChange={(e) => updateSettings({ phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Address</Label>
            <Input className="mt-1" value={settings.address} onChange={(e) => updateSettings({ address: e.target.value })} />
          </div>
        </div>
      </Panel>

      <Panel title="Appearance">
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <Button
              key={t}
              variant={settings.theme === t ? "default" : "outline"}
              className="rounded-xl capitalize"
              onClick={() => updateSettings({ theme: t })}
            >
              {t}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel title="Security">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
            <span className="text-sm font-bold">PIN Lock</span>
            <Switch checked={settings.pinLock} onCheckedChange={(v) => updateSettings({ pinLock: v })} />
          </div>
          <div>
            <Label className="text-xs">Change PIN (4 digit)</Label>
            <Input
              className="mt-1"
              maxLength={4}
              value={settings.pin}
              onChange={(e) => updateSettings({ pin: e.target.value })}
            />
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => setLocked(true)}>
            Abhi Lock Karein
          </Button>
        </div>
      </Panel>

      <Panel title="Receipt">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            {(["58mm", "80mm", "A5"] as const).map((s) => (
              <Button
                key={s}
                variant={settings.receiptSize === s ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => updateSettings({ receiptSize: s })}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
            <span className="text-sm font-bold">Store name receipt par</span>
            <Switch
              checked={settings.showStoreNameOnReceipt}
              onCheckedChange={(v) => updateSettings({ showStoreNameOnReceipt: v })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Footer Message</Label>
            <Input
              className="mt-1"
              value={settings.receiptFooter}
              onChange={(e) => updateSettings({ receiptFooter: e.target.value })}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Data">
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl" onClick={() => toast.success("Backup tayar hai — apna backup safe jagah save karein.")}>
            Backup Data
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => toast.success("Backup download ho gaya")}>
            Download Backup
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => setConfirm("restore")}>
            Restore / Import
          </Button>
          <Button variant="outline" className="rounded-xl text-danger" onClick={() => setConfirm("reset")}>
            Reset Data
          </Button>
        </div>
      </Panel>

      <Panel title="About">
        <p className="text-sm text-muted-foreground">DukaanFlow — Version 1.0 (UI Prototype)</p>
      </Panel>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "reset" ? "Saara data reset karein?" : "Backup restore karein?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reset"
                ? "Ye action wapas nahi ho sakta. Sab demo data dobara set ho jayega."
                : "Purana backup import hone se maujooda data replace ho jayega."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nahi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm === "reset") {
                  resetData();
                  toast.success("Data reset ho gaya");
                } else {
                  toast.success("Backup restore ho gaya");
                }
              }}
            >
              Haan, karein
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
