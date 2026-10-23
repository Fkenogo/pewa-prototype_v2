import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Info, MousePointerClick, Plus, ShieldAlert, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  canManagePromotions,
  evaluateCampaignDelivery,
  getAuthoritativeMenus,
  getAuthoritativeVenues,
  getEffectiveBusinessRole,
  getVenuePublishedMenus,
  PROTOTYPE_DEMO_DATE_ISO,
  resolveScenarioReferenceTimeMs,
  usePewa,
} from "@/lib/pewa/store";
import { FeaturedCampaignPlacementCard } from "@/components/pewa/Discovery";
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
  const state = usePewa();
  const { organisation, venues, menus, simulatedTime, campaigns, createCampaign, toggleCampaign } =
    state;
  const effectiveRole = getEffectiveBusinessRole(state);
  const [tab, setTab] = useState<"paid" | "specials">("paid");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New campaign form state
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [venueId, setVenueId] = useState("");
  const [budget, setBudget] = useState("50");

  // Campaign targets are limited to venues of the active organisation. The effective selection is
  // derived on each render, so an organisation switch revalidates it without a global fallback.
  const orgVenues = venues.filter((v) => v.orgId === organisation?.id);
  const selectedVenue = orgVenues.find((v) => v.id === venueId) || orgVenues[0];

  const allVenues = getAuthoritativeVenues({ venues });
  const allMenus = getAuthoritativeMenus({ menus });

  if (!canManagePromotions(effectiveRole)) {
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
    if (!selectedVenue) {
      toast.error("No eligible venue in the active organisation to target.");
      return;
    }
    const targetVenue = selectedVenue;

    const refStartMs = resolveScenarioReferenceTimeMs(simulatedTime);

    const campaignId = createCampaign({
      orgId: targetVenue.orgId,
      venueId: targetVenue.id,
      title: title.trim(),
      tagline: tagline.trim(),
      badgeText: "Sponsored",
      budget: parseFloat(budget) || 50,
      active: true,
      startDate: new Date(refStartMs).toISOString(),
      endDate: new Date(refStartMs + 14 * 86400000).toISOString(),
    });

    if (!campaignId) {
      toast.error(
        "Campaign could not be created. Check that you can manage promotions for the active organisation.",
      );
      return;
    }

    setCreateModalOpen(false);
    setTitle("");
    setTagline("");
    toast.success("Campaign launched successfully on PEWA Home.");
  };

  const orgCampaigns = campaigns.filter((c) =>
    venues.some((v) => v.id === c.venueId && v.orgId === organisation?.id),
  );

  const selectedFormVenue = selectedVenue;
  const selectedFormPublicMenu = selectedFormVenue
    ? getVenuePublishedMenus(selectedFormVenue, allMenus, allVenues, { includeProtected: false })[0]
    : undefined;

  return (
    <main className="mx-auto max-w-4xl px-4 pt-16 pb-16 md:pt-6">
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
                  Only delivered, on-screen qualifying impressions (at least 50% of the sponsored
                  card visible in the customer viewport for ≥300ms) count toward campaign activity.
                  Clicks are tracked separately as engagement and do not draw down budget.
                  (Client-side IntersectionObserver exposure tracking, deterministic demonstration
                  reference date {PROTOTYPE_DEMO_DATE_ISO} for time-only scenario clocks, and
                  $0.10/impression pricing are non-authoritative prototype simulations rather than
                  production clock or advertising billing infrastructure).
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
                  const targetVenue =
                    allVenues.find((v) => v.id === camp.venueId) ||
                    venues.find((v) => v.id === camp.venueId);
                  const publicMenus = targetVenue
                    ? getVenuePublishedMenus(targetVenue, allMenus, allVenues, {
                        includeProtected: false,
                      })
                    : [];
                  const publishedMenu = publicMenus[0];
                  const evaluation = evaluateCampaignDelivery(camp, {
                    organisation,
                    venues,
                    menus,
                    referenceTimeIso: simulatedTime,
                  });
                  const ctr =
                    camp.impressions > 0
                      ? ((camp.clicks / camp.impressions) * 100).toFixed(1)
                      : "0.0";

                  const badgeColors =
                    evaluation.state === "eligible"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : evaluation.state === "suspended" || evaluation.state === "unpublished_venue"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : evaluation.state === "exhausted" || evaluation.state === "expired"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground";

                  return (
                    <article
                      key={camp.id}
                      data-testid={`campaign-admin-card-${camp.id}`}
                      className="rounded-2xl border bg-card p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors}`}
                          >
                            {evaluation.label}
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

                        {evaluation.reason && (
                          <div className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-50/60 p-2.5 text-[11px] text-amber-950 dark:bg-amber-950/20 dark:text-amber-200">
                            {evaluation.reason}
                          </div>
                        )}

                        {/* Customer Placement Preview */}
                        {targetVenue && (
                          <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-3">
                            <div className="mb-2 flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                                Customer Placement Preview (PEWA Home)
                              </span>
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {publishedMenu
                                  ? "Using published menu"
                                  : "No public menu published"}
                              </span>
                            </div>
                            <FeaturedCampaignPlacementCard
                              campaign={camp}
                              venue={targetVenue}
                              publishedMenu={publishedMenu}
                              previewOnly
                            />
                          </div>
                        )}
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

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Spend: <b>${camp.spent.toFixed(2)}</b> / ${camp.budget.toFixed(2)}
                            </span>
                            <span className="block text-[11px] font-medium text-foreground/80">
                              Remaining entitlement: <b>${evaluation.remainingBudget.toFixed(2)}</b>{" "}
                              ({evaluation.remainingImpressionsEntitlement} views)
                            </span>
                            <span className="block text-[10px] text-muted-foreground italic">
                              Simulated exposure rate ($0.10/view); clicks do not consume budget
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCampaign(camp.id)}
                            className="h-8 text-xs shrink-0"
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                value={selectedVenue?.id || ""}
                onChange={(e) => setVenueId(e.target.value)}
                disabled={orgVenues.length === 0}
                className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                {orgVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              {orgVenues.length === 0 && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  No venue is available in {organisation?.name || "the active organisation"}.
                  Register a venue before launching a campaign.
                </p>
              )}
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

            {/* Live Customer Placement Preview in Modal */}
            {selectedFormVenue && (
              <div className="rounded-xl border border-dashed bg-muted/20 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Live Customer Placement Preview
                </p>
                <FeaturedCampaignPlacementCard
                  campaign={{
                    id: "draft_preview",
                    title: title.trim() || "20% Off Slow Cold Brews All Week",
                    tagline:
                      tagline.trim() ||
                      selectedFormVenue.tagline ||
                      "Available on our published menu",
                    badgeText: "Sponsored",
                  }}
                  venue={selectedFormVenue}
                  publishedMenu={selectedFormPublicMenu}
                  previewOnly
                />
                {!selectedFormPublicMenu && (
                  <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                    Note: {selectedFormVenue.name} does not currently have a public published menu.
                    Campaign will remain withheld until a menu is published.
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="submit" className="h-11 w-full" disabled={!selectedVenue}>
                Launch Sponsored Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
