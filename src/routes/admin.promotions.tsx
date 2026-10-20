import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  Info,
  MousePointerClick,
  Plus,
  ShieldAlert,
  Sparkles,
  Tag,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { canManagePromotions, usePewa } from "@/lib/pewa/store";
import { pageHead } from "@/lib/pewa/metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/promotions")({
  head: () =>
    pageHead(
      "Promotions & Featured Offers",
      "Launch sponsored campaigns on PEWA Home or manage free in-menu specials.",
    ),
  component: PromotionsPage,
});

function PromotionsPage() {
  const { organisation, venues, campaigns, role, createCampaign, toggleCampaign } = usePewa();
  const [tab, setTab] = useState<"paid" | "specials">("paid");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New campaign form state
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [venueId, setVenueId] = useState(venues[0]?.id || "");
  const [budget, setBudget] = useState("50");

  if (!canManagePromotions(role)) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Promotions and campaigns are managed by Organisation Owners, Administrators, and Business
          Managers. Operational staff cannot create campaigns.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/admin">Back to workspace</Link>
          </Button>
        </div>
      </main>
    );
  }

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !tagline.trim()) {
      toast.error("Please enter both a campaign title and a promotional tagline.");
      return;
    }
    const targetVenue = venues.find((v) => v.id === venueId) || venues[0];
    if (!targetVenue) return;

    createCampaign({
      orgId: targetVenue.orgId,
      venueId: targetVenue.id,
      title: title.trim(),
      tagline: tagline.trim(),
      badgeText: "Sponsored",
      budget: parseFloat(budget) || 50,
      active: true,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    });

    setCreateModalOpen(false);
    setTitle("");
    setTagline("");
    toast.success("Campaign launched successfully on PEWA Home.");
  };

  const orgCampaigns = campaigns.filter((c) =>
    venues.some((v) => v.id === c.venueId && v.orgId === organisation?.id),
  );

  return (
    <main className="mx-auto max-w-4xl px-4 pt-16 md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{organisation?.name}</p>
          <h1 className="text-3xl font-bold">Promotions Studio</h1>
        </div>
        {tab === "paid" && (
          <Button onClick={() => setCreateModalOpen(true)} className="h-11">
            <Plus className="mr-2 h-4 w-4" /> New Featured Offer
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="my-6 grid grid-cols-2 gap-2" role="tablist">
        <Button
          role="tab"
          aria-selected={tab === "paid"}
          variant={tab === "paid" ? "default" : "outline"}
          onClick={() => setTab("paid")}
          className="h-11"
        >
          <Sparkles className="mr-2 h-4 w-4" /> Paid Featured Offers (Home)
        </Button>
        <Button
          role="tab"
          aria-selected={tab === "specials"}
          variant={tab === "specials" ? "default" : "outline"}
          onClick={() => setTab("specials")}
          className="h-11"
        >
          <Tag className="mr-2 h-4 w-4" /> Free In-Menu Specials
        </Button>
      </div>

      {tab === "paid" ? (
        <div className="space-y-6">
          {/* Policy Invariant Disclaimer */}
          <section className="rounded-2xl border bg-card p-4 text-xs text-muted-foreground shadow-xs">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Product Truth: Sponsored Placement Integrity
                </p>
                <p>
                  Paid Featured Offers appear exclusively in the designated <b>Featured Offers</b>{" "}
                  section of PEWA Home with a high-contrast <b>Sponsored</b> pill. Paid campaigns{" "}
                  <b>never</b> influence or boost organic directory search rankings.
                </p>
                <p>
                  Only delivered, on-screen qualifying impressions count toward campaign activity.
                </p>
              </div>
            </div>
          </section>

          {/* Active Campaigns List */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold">Your Campaigns</h2>
            {!orgCampaigns.length ? (
              <div className="rounded-2xl border bg-card py-12 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 font-semibold">No campaigns active</p>
                <p className="text-xs text-muted-foreground">
                  Launch a Featured Offer to reach customers browsing PEWA Home.
                </p>
                <Button onClick={() => setCreateModalOpen(true)} className="mt-4" size="sm">
                  Create first offer
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {orgCampaigns.map((camp) => {
                  const targetVenue = venues.find((v) => v.id === camp.venueId);
                  const ctr =
                    camp.impressions > 0
                      ? ((camp.clicks / camp.impressions) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <article
                      key={camp.id}
                      className="rounded-2xl border bg-card p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              camp.active
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {camp.active ? "Active" : "Paused"}
                          </span>
                          <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                            {camp.badgeText}
                          </span>
                        </div>
                        <h3 className="mt-3 font-bold text-lg">{camp.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{camp.tagline}</p>
                        <p className="mt-2 text-xs font-medium text-primary">
                          Venue: {targetVenue?.name}
                        </p>
                      </div>

                      <div className="mt-5 border-t pt-4">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-lg bg-muted/40 p-2">
                            <span className="flex items-center justify-center gap-1 text-muted-foreground">
                              <Eye className="h-3 w-3" /> Views
                            </span>
                            <p className="mt-1 font-bold text-sm">{camp.impressions}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-2">
                            <span className="flex items-center justify-center gap-1 text-muted-foreground">
                              <MousePointerClick className="h-3 w-3" /> Clicks
                            </span>
                            <p className="mt-1 font-bold text-sm">{camp.clicks}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-2">
                            <span className="text-muted-foreground">CTR</span>
                            <p className="mt-1 font-bold text-sm">{ctr}%</p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Spend: <b>${camp.spent.toFixed(2)}</b> / ${camp.budget.toFixed(2)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCampaign(camp.id)}
                            className="h-8 text-xs"
                          >
                            {camp.active ? "Pause campaign" : "Resume campaign"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* In-Menu Specials Tab */
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="font-display text-xl font-bold">Free In-Menu Badges & Specials</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Unlike paid Featured Offers on PEWA Home, in-menu specials are 100% free. You can
              highlight signature items directly inside your published menu (e.g., “Chef’s Special”,
              “20% Off Lunch”, “Signature Dish”).
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">
                    ★ Chef’s Special
                  </span>
                  <span className="text-xs text-muted-foreground">Example badge on dishes</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Applied to items like Prime Aged Ribeye at The Grand Horizon Hotel.
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">
                    ★ 20% Off Launch
                  </span>
                  <span className="text-xs text-muted-foreground">Example discount badge</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Applied to promotional offerings at CloudBurger Kitchen.
                </p>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                To add or modify in-menu badges, navigate to your menus and edit the offering.
              </p>
              <Button asChild variant="outline" className="mt-3">
                <Link to="/admin">Go to Menu Authoring →</Link>
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* Create Campaign Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create Featured Offer</DialogTitle>
            <DialogDescription>
              Reach local customers on PEWA Home. Clearly marked as Sponsored; does not impact
              organic ranking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCampaign} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Campaign Title</label>
              <Input
                placeholder="e.g. 20% Off Slow Cold Brews All Week"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-11"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Tagline / Highlight
              </label>
              <Input
                placeholder="e.g. Steeped 18 hours · Garden-fresh brew"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="mt-1 h-11"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Target Venue</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Simulated Budget ($)
              </label>
              <Input
                type="number"
                min="10"
                max="500"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-1 h-11"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="h-11 w-full">
                Launch Sponsored Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
