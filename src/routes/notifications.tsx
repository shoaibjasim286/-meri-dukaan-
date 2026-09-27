import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDate, formatTime } from "@/lib/format";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/dukaan/primitives";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — DukaanFlow" },
      { name: "description", content: "Low stock, udhaar, closing aur backup ke alerts." },
      { property: "og:title", content: "Notifications — DukaanFlow" },
      { property: "og:description", content: "Zaroori kaam yaad dilane wale alerts." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { notifications, markNotificationsRead } = useStore();

  useEffect(() => {
    markNotificationsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle="Aapki dukaan ke alerts" />
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Koi notification nahi" body="Sab kuch theek chal raha hai." />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-bold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDate(n.date)} {formatTime(n.date)}
                  </p>
                </div>
                <Pill
                  tone={
                    n.type === "Low Stock"
                      ? "danger"
                      : n.type === "Udhaar"
                        ? "amber"
                        : n.type === "Backup"
                          ? "teal"
                          : "primary"
                  }
                >
                  {n.type}
                </Pill>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
