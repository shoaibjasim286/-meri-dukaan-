import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScrollText } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDate, formatTime } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { EmptyState, FilterChips, PageHeader, Panel, SearchBar } from "@/components/dukaan/primitives";

export const Route = createFileRoute("/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — DukaanFlow" },
      { name: "description", content: "Kis staff ne kya kiya — poori activity ka record." },
      { property: "og:title", content: "Audit Log — DukaanFlow" },
      { property: "og:description", content: "Har action ka time aur staff." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { audit, staff, currentStaff } = useStore();
  const canViewAudit = hasPermission(currentStaff, "audit.view");
  const [query, setQuery] = useState("");
  const [who, setWho] = useState("Sab");

  const options = ["Sab", ...staff.map((s) => s.name)];
  const list = audit.filter(
    (a) =>
      (who === "Sab" || a.staff === who) &&
      (a.action.toLowerCase().includes(query.toLowerCase()) ||
        a.detail.toLowerCase().includes(query.toLowerCase())),
  );

  if (!canViewAudit) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold">Permission Nahi Hai</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Audit log dekhne ki ijazat nahi hai. Admin se rabta karein.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" subtitle="Dukaan ki saari activity" />
      <SearchBar value={query} onChange={setQuery} placeholder="Action ya detail..." />
      <FilterChips options={options} value={who} onChange={setWho} />

      {list.length === 0 ? (
        <EmptyState icon={ScrollText} title="Koi activity nahi" body="Filter badal kar dekhein." />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {list.map((a) => (
              <li key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 sm:px-5">
                <span className="shrink-0 text-xs font-bold text-muted-foreground">
                  {formatTime(a.date)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">
                    {a.staff} — {a.action}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.detail} · {formatDate(a.date)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
