import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Check, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { usePewa, canManageOrders } from "@/lib/pewa/store";
import { pageHead } from "@/lib/pewa/metadata";
import { OrderSnapshot, STATUS_LABELS } from "@/components/pewa/OrderSnapshot";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/orders")({
  head: () => pageHead("Incoming orders", "Review guest requests, accept or decline and mark accepted orders ready."),
  component: OrderCockpit,
});
function OrderCockpit() {
  const { orders, organisation, role, orderPolicy, acceptOrder, declineOrder, markOrderReady } = usePewa();
  const [tab, setTab] = useState("pending");
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("Unable to fulfil this request");
  const mine = orders.filter((o) => o.orgId === organisation?.id);
  const pending = mine.filter((o) => o.status === "pending").length;
  const visible = mine.filter((o) => tab === "pending" ? o.status === "pending" : tab === "accepted" ? o.status === "accepted" : ["ready", "declined", "withdrawn"].includes(o.status));
  const act = (success: boolean) => { if (!success) toast.error("This request has changed, or acceptance capacity is exhausted. Refresh the decision before trying again."); };
  return <main className="mx-auto max-w-4xl px-4 pt-16 md:pt-6">
    <p className="text-sm text-muted-foreground">{organisation?.name}</p><div className="mt-1 flex items-center justify-between"><h1 className="text-3xl">Orders</h1><ClipboardList className="h-6 w-6 text-primary" /></div>
    {role !== "staff" && <p className="mt-3 text-sm text-muted-foreground">{orderPolicy.expired ? "Subscription expired · new requests paused" : `${orderPolicy.included + orderPolicy.topUp} acceptance units available`}{orderPolicy.overdraftUsed > 0 && ` · ${orderPolicy.overdraftUsed}/10 continuity units used`}</p>}
    <div aria-live="polite" className="mt-5 flex items-center gap-2 border-y py-3 font-semibold text-primary"><Bell className={pending ? "motion-safe:animate-pulse" : ""} />{pending} {pending === 1 ? "request awaiting decision" : "requests awaiting decision"}</div>
    <div className="my-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Order status">{[["pending", "Incoming"], ["accepted", "Preparing"], ["history", "History"]].map(([key, label]) => <Button key={key} role="tab" aria-selected={tab === key} variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>{label}</Button>)}</div>
    {!visible.length && <p className="py-12 text-center text-muted-foreground">No {tab === "pending" ? "incoming requests" : tab === "accepted" ? "orders preparing" : "completed requests"}.</p>}
    <div className="grid gap-4 lg:grid-cols-2">{visible.map((order) => <article key={order.id} className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-sans font-bold">{order.reference}</h2><span className="text-xs font-semibold text-primary">{STATUS_LABELS[order.status]}</span></div>
      <OrderSnapshot order={order} merchant />
      {order.declineReason && <p className="mt-3 text-sm text-muted-foreground">{order.declineReason}</p>}
      {canManageOrders(role) && order.status === "pending" && <div className="mt-4 space-y-3">{declining === order.id ? <><label className="block text-sm">Decline reason<select aria-label="Decline reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-2"><option>Unable to fulfil this request</option><option>Item no longer available</option><option>Kitchen at capacity</option><option>Service unavailable</option></select></label><div className="flex gap-2"><Button variant="destructive" className="flex-1" onClick={() => { act(declineOrder(order.id, reason)); setDeclining(null); }}>Confirm decline</Button><Button variant="outline" onClick={() => setDeclining(null)}>Back</Button></div></> : <div className="flex gap-2"><Button className="h-11 flex-1" onClick={() => act(acceptOrder(order.id))}><Check />Accept order</Button><Button variant="outline" className="h-11 flex-1" onClick={() => setDeclining(order.id)}>Decline</Button></div>}</div>}
      {canManageOrders(role) && order.status === "accepted" && <Button className="mt-4 h-11 w-full" onClick={() => act(markOrderReady(order.id))}><Check />Mark as ready</Button>}
      <Link to="/orders/$orderId" params={{ orderId: order.id }} className="mt-4 block text-center text-xs text-primary underline">Customer status</Link>
    </article>)}</div>
  </main>;
}