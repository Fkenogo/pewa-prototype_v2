import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { usePewa } from "@/lib/pewa/store";
import { pageHead } from "@/lib/pewa/metadata";
import { OrderSnapshot, STATUS_LABELS } from "@/components/pewa/OrderSnapshot";
import { ContactDrawer } from "@/components/pewa/ContactDrawer";
import { CustomerNav } from "@/components/pewa/CustomerNav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders/$orderId")({
  head: () => pageHead("Track order request", "See your saved order and live business acceptance or ready status."),
  component: Tracking,
});
function Tracking() {
  const { orderId } = Route.useParams();
  const { orders, venues, withdrawOrder } = usePewa();
  const [contact, setContact] = useState(false);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const order = orders.find((o) => o.id === orderId);
  const venue = venues.find((v) => v.id === order?.venueId);
  if (!order) return <main className="mx-auto max-w-lg px-4 pt-20"><h1 className="text-2xl">Request not found in this browser</h1><Link to="/orders" className="mt-4 block text-primary underline">My requests</Link></main>;
  const stopped = order.status === "withdrawn" || order.status === "declined";
  return <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-16">
    <Link to="/orders" className="text-sm text-primary">← My requests</Link>
    <p className="mt-5 font-mono text-xs text-muted-foreground">{order.reference}</p><h1 className="mt-2 text-3xl">{order.venueName}</h1>
    <section aria-live="polite" className="my-6 border-y py-5"><div className="flex items-center gap-3 text-primary">{order.status === "pending" ? <Clock className="h-6 w-6 motion-safe:animate-pulse text-status-hidden" /> : <Check className="h-6 w-6" />}<h2 className="text-xl">{STATUS_LABELS[order.status]}</h2></div>
      <p className="mt-2 text-sm text-muted-foreground">{order.status === "pending" ? "Your request has reached the business. It is not a confirmed sale until they accept." : order.status === "ready" ? "The business has marked your order ready. Arrange collection or service directly with them." : order.status === "accepted" ? "The business has accepted your order. Payment and fulfilment are arranged directly." : order.status === "declined" ? order.declineReason : "You withdrew this request before acceptance."}</p>
      {!stopped && <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">{["Submitted", "Accepted", "Ready"].map((label, i) => <li key={label} className={`border-t-4 pt-2 ${i === 0 || (i === 1 && order.status !== "pending") || order.status === "ready" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{label}</li>)}</ol>}
    </section>
    <OrderSnapshot order={order} />
    {order.acceptedAt && <p className="mt-3 text-xs text-muted-foreground">Accepted {new Date(order.acceptedAt).toLocaleString()}</p>}
    {order.status === "pending" && <div className="mt-5">{confirmWithdrawal ? <div className="space-y-2"><p className="text-sm">Withdraw this request? The business will no longer be able to accept it.</p><div className="flex gap-2"><Button variant="destructive" onClick={() => { const ok = withdrawOrder(order.id); setConfirmWithdrawal(false); if (!ok) toast.error("The business already made a decision. Contact them directly."); }}>Confirm withdrawal</Button><Button variant="outline" onClick={() => setConfirmWithdrawal(false)}>Keep request</Button></div></div> : <Button variant="outline" className="h-11 w-full" onClick={() => setConfirmWithdrawal(true)}>Withdraw request</Button>}</div>}
    {venue && <><Button variant="secondary" className="mt-3 h-11 w-full" onClick={() => setContact(true)}><MessageCircle />Contact business</Button><ContactDrawer venue={venue} open={contact} onOpenChange={setContact} /></>}
    <CustomerNav />
  </main>;
}