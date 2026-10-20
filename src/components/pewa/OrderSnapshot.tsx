import type { OrderRequest } from "@/lib/pewa/types";
import { formatPrice } from "@/lib/pewa/store";
import { lineTotal } from "@/lib/pewa/ordering";

export function OrderSnapshot({
  order,
  merchant = false,
}: {
  order: OrderRequest;
  merchant?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span>{order.service}</span>
        <span>{order.guestName}</span>
        {merchant && <span>{order.guestContact}</span>}
      </div>
      <ul className="divide-y border-y">
        {order.lines.map((line) => (
          <li key={line.id} className="flex gap-3 py-3">
            <span className="text-2xl" aria-hidden>
              {line.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {line.quantity} × {line.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {line.options.map((o) => o.name).join(" · ")}
              </p>
              {line.note && <p className="break-words text-sm">{line.note}</p>}
            </div>
            <span className="shrink-0 text-sm font-semibold">
              {formatPrice(lineTotal(line), order.currency)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between font-semibold">
        <span>Request total</span>
        <span>{formatPrice(order.total, order.currency)}</span>
      </div>
      {order.note && (
        <p className="break-words text-sm text-muted-foreground">Notes: {order.note}</p>
      )}
      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
        Submitted {new Date(order.submittedAt).toLocaleString()} · Prices saved at submission
      </p>
    </div>
  );
}

export const STATUS_LABELS: Record<OrderRequest["status"], string> = {
  pending: "Awaiting business acceptance",
  accepted: "Accepted by business",
  ready: "Ready",
  declined: "Declined",
  withdrawn: "Withdrawn",
};
