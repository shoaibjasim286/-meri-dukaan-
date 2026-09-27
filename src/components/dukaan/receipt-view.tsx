import { useStore } from "@/lib/store";
import { formatDate, formatTime, rs } from "@/lib/format";
import type { Sale } from "@/lib/types";

export function ReceiptView({ sale }: { sale: Sale }) {
  const { settings } = useStore();
  const subtotal = sale.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 font-mono text-sm">
      {settings.showStoreNameOnReceipt ? (
        <p className="text-center text-base font-bold">{settings.storeName}</p>
      ) : null}
      <p className="text-center text-xs text-muted-foreground">{settings.phone}</p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Sale #{sale.number} · {formatDate(sale.date)} {formatTime(sale.date)}
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Customer: {sale.customerName} · Staff: {sale.staff}
      </p>

      <div className="my-3 border-t border-dashed border-border" />
      <ul className="space-y-1">
        {sale.items.map((i) => (
          <li key={i.productId} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">
              {i.name} × {i.qty}
            </span>
            <span className="shrink-0">{rs(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-dashed border-border" />

      <dl className="space-y-1">
        <Line label="Subtotal" value={rs(subtotal)} />
        <Line label="Discount" value={rs(sale.discount)} />
        <Line label="Total" value={rs(sale.total)} bold />
        <Line label="Paid" value={rs(sale.paid)} />
        <Line label="Baqi" value={rs(sale.total - sale.paid)} />
        <Line label="Payment" value={sale.mode} />
      </dl>

      <p className="mt-3 text-center text-xs text-muted-foreground">{settings.receiptFooter}</p>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
