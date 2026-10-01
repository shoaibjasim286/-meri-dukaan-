import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { PageHeader, Panel } from "@/components/dukaan/primitives";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { InstallPrompt } from "@/components/dukaan/install-prompt";
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
  const {
    settings,
    updateSettings,
    resetData,
    loadDemoData,
    setLocked,
    downloadBackup,
    restoreBackup,
    currentStaff,
    changeCurrentStaffPin,
  } = useStore();
  const canEditSettings = hasPermission(currentStaff, "settings.edit");
  const canDownloadBackup = hasPermission(currentStaff, "backup.download");
  const canRestoreBackup = hasPermission(currentStaff, "backup.restore");
  const [pinDraft, setPinDraft] = useState("");
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<null | "reset" | "demo">(null);

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

      <Panel title="Install App">
        <InstallPrompt />
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
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={pinDraft}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPinDraft(digits);
              }}
            />
            {pinDraft.length > 0 && pinDraft.length !== 4 ? (
              <p className="mt-1 text-xs text-danger">
                PIN exactly 4 digit ka hona chahiye
              </p>
            ) : null}
            <Button
              type="button"
              className="mt-2 rounded-xl"
              disabled={pinDraft.length !== 4}
              onClick={async () => {
                if (pinDraft.length !== 4) {
                  toast.error("PIN exactly 4 digit ka hona chahiye");
                  return;
                }
                const result = await changeCurrentStaffPin(pinDraft.trim());
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                setPinDraft("");
                toast.success("PIN save ho gaya");
              }}
            >
              PIN Save Karein
            </Button>
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
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={!canDownloadBackup}
            title={!canDownloadBackup ? "Aapko ye permission nahi hai" : undefined}
            onClick={downloadBackup}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Backup
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={!canRestoreBackup}
            title={!canRestoreBackup ? "Aapko ye permission nahi hai" : undefined}
            onClick={() => restoreInputRef.current?.click()}
          >
            Restore / Import
          </Button>
          <input
            ref={restoreInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.currentTarget.value = "";
              if (file) void restoreBackup(file);
            }}
          />
        </div>
      </Panel>

      <Panel title="Data Management">
        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="text-sm font-bold">
            {settings.isDemoMode === true
              ? "Abhi demo data load hai"
              : "Aapka apna data hai"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Demo aur blank data ke darmiyan switch karne se current app state replace hoti hai.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-danger bg-danger text-danger-foreground hover:bg-danger/90"
            disabled={!canEditSettings}
            title={!canEditSettings ? "Aapko ye permission nahi hai" : undefined}
            onClick={() => setConfirm("reset")}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Reset to Blank
          </Button>

          <Button
            variant="outline"
            className="rounded-xl border-warning bg-warning text-warning-foreground hover:bg-warning/90"
            disabled={!canEditSettings}
            title={!canEditSettings ? "Aapko ye permission nahi hai" : undefined}
            onClick={() => setConfirm("demo")}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Load Demo Data
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
            {confirm === "demo"
              ? "Demo data load karein?"
              : "Saara data blank karein?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm === "demo"
              ? "Current data overwrite ho jayega demo data se. Continue?"
              : "Saara data delete ho jayega. Continue?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Nahi</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (confirm === "demo") {
                loadDemoData();
              } else if (confirm === "reset") {
                resetData();
              }
              setConfirm(null);
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
