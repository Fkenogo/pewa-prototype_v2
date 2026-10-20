import { createFileRoute, Link } from "@tanstack/react-router";
import { usePewa, formatPrice } from "@/lib/pewa/store";
import { pageHead } from "@/lib/pewa/metadata";
import { CustomerNav } from "@/components/pewa/CustomerNav";
import { STATUS_LABELS } from "@/components/pewa/OrderSnapshot";

export const Route = createFileRoute("/orders/")({
  head: () => pageHead("My order requests", "Track your guest order requests and business decisions."),
  component: Requests,
});
function Requests() {
  const orders = usePewa((s) => s.orders);
  return <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-16"><Link to="/" className="font-display text-xl text-primary">pewa</Link><h1 className="mt-4 text-3xl">My requests</h1>
    <div className="mt-6 space-y-3">{orders.map((o) => <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="block rounded-lg border bg-card p-4"><div className="flex justify-between gap-2"><span className="font-semibold">{o.venueName}</span><span className="text-sm">{formatPrice(o.total, o.currency)}</span></div><p className="mt-2 text-sm text-primary">{STATUS_LABELS[o.status]}</p><p className="mt-2 text-xs text-muted-foreground">{o.reference} · {new Date(o.submittedAt).toLocaleString()}</p></Link>)}</div>
    {!orders.length && <p className="mt-8 text-muted-foreground">No order requests yet.</p>}<CustomerNav />
  </main>;
}