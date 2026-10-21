import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  History,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  ROLE_LABELS,
  canAuthorMenus,
  canManageOrders,
  formatPrice,
  usePewa,
} from "@/lib/pewa/store";
import type { ModerationCase, OrgStatus, Role, UsageDisputeCase } from "@/lib/pewa/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/operator")({
  head: () => ({
    meta: [
      { title: "PEWA Operator Console — Platform Operations & Compliance" },
      {
        name: "description",
        content:
          "Internal PEWA platform console for tenant oversight, usage dispute resolution, and content moderation.",
      },
      { property: "og:title", content: "PEWA Operator Console" },
      {
        property: "og:description",
        content:
          "Internal administrative console with bounded tenant management and technical guardrail enforcement.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: OperatorConsolePage,
});

// Known platform tenants fixture references for comprehensive multi-tenant overview
const PLATFORM_TENANTS_CATALOG = [
  {
    id: "org_ggc",
    name: "Green Garden Café Ltd",
    businessType: "Single-venue café & roastery",
    venueCount: 1,
    tier: "Base Monthly Tier",
    currency: "KES",
  },
  {
    id: "org_horizon",
    name: "The Grand Horizon Hotel",
    businessType: "Luxury hotel & hospitality",
    venueCount: 1,
    tier: "Enterprise Hospitality Tier",
    currency: "KES",
  },
  {
    id: "org_cloudburger",
    name: "CloudBurger Kitchen Ltd",
    businessType: "Delivery-only cloud kitchen",
    venueCount: 1,
    tier: "High-Volume Kitchen Tier",
    currency: "KES",
  },
  {
    id: "org_multi_brand",
    name: "Horizon Hospitality Group",
    businessType: "Multi-brand restaurant conglomerate",
    venueCount: 3,
    tier: "Multi-Brand Commercial Tier",
    currency: "KES",
  },
];

export function OperatorConsolePage() {
  const {
    role,
    setRole,
    organisation,
    venues,
    menus,
    orders,
    orderPolicy,
    campaigns,
    disputes,
    moderationCases,
    activity,
    setOrganisationStatus,
    resolveDisputeCase,
    resolveModerationCase,
    toggleCampaign,
  } = usePewa();

  const [activeTab, setActiveTab] = useState("tenants");
  const [searchQuery, setSearchQuery] = useState("");

  // Dispute modal state
  const [selectedDispute, setSelectedDispute] = useState<UsageDisputeCase | null>(null);
  const [disputeResolution, setDisputeResolution] = useState<"resolved" | "dismissed">("resolved");
  const [adjustmentUnits, setAdjustmentUnits] = useState<number>(1);
  const [disputeNote, setDisputeNote] = useState<string>("");

  // Tenant suspend modal state
  const [selectedTenantToSuspend, setSelectedTenantToSuspend] = useState<{
    id: string;
    name: string;
    currentStatus: OrgStatus;
  } | null>(null);
  const [suspensionNote, setSuspensionNote] = useState("");

  // Moderation modal state
  const [selectedModCase, setSelectedModCase] = useState<ModerationCase | null>(null);
  const [modActionText, setModActionText] = useState("");

  // Current tenant status (default to active if undefined)
  const currentOrgStatus: OrgStatus = organisation?.status || "active";

  const handleApplyDisputeResolution = () => {
    if (!selectedDispute) return;
    if (!disputeNote.trim()) {
      toast.error("Please provide an audit note explaining this resolution.");
      return;
    }

    const units = disputeResolution === "resolved" ? Number(adjustmentUnits) || 0 : 0;
    resolveDisputeCase(selectedDispute.id, disputeResolution, units, disputeNote.trim());
    toast.success(
      disputeResolution === "resolved"
        ? `Dispute resolved. Credited +${units} order unit(s) to merchant.`
        : "Dispute dismissed with compliance note.",
    );
    setSelectedDispute(null);
    setDisputeNote("");
    setAdjustmentUnits(1);
  };

  const handleApplyTenantStatus = (newStatus: OrgStatus) => {
    if (!selectedTenantToSuspend) return;
    setOrganisationStatus(selectedTenantToSuspend.id, newStatus, suspensionNote.trim());
    toast.success(
      `Tenant “${selectedTenantToSuspend.name}” ${
        newStatus === "suspended" ? "suspended" : "reactivated"
      }.`,
    );
    setSelectedTenantToSuspend(null);
    setSuspensionNote("");
  };

  const handleApplyModeration = () => {
    if (!selectedModCase) return;
    if (!modActionText.trim()) {
      toast.error("Please specify the corrective action taken.");
      return;
    }
    resolveModerationCase(selectedModCase.id, modActionText.trim());
    toast.success(`Moderation case ${selectedModCase.id} resolved.`);
    setSelectedModCase(null);
    setModActionText("");
  };

  // Guardrail test simulation handlers
  const handleGuardrailOrderAttempt = () => {
    if (role === "operator" || !canManageOrders(role)) {
      toast.error("PROHIBITED: Operator cannot accept orders on behalf of merchants.", {
        description:
          "Technical Guardrail: Merchant acceptance decisions are strictly merchant-authoritative.",
      });
    } else {
      toast.info(
        `Active role is ${ROLE_LABELS[role]}. Switch to Operator to test guardrail block.`,
      );
    }
  };

  const handleGuardrailPriceAttempt = () => {
    if (role === "operator" || !canAuthorMenus(role)) {
      toast.error("PROHIBITED: Operator cannot alter merchant menu prices.", {
        description:
          "Technical Guardrail: Menu pricing is owned solely by authorized merchant roles.",
      });
    } else {
      toast.info(
        `Active role is ${ROLE_LABELS[role]}. Switch to Operator to test guardrail block.`,
      );
    }
  };

  const handleGuardrailReadyAttempt = () => {
    if (role === "operator" || !canManageOrders(role)) {
      toast.error("PROHIBITED: Operator cannot declare food ready.", {
        description:
          "Technical Guardrail: Kitchen fulfillment state is restricted to merchant kitchen staff.",
      });
    } else {
      toast.info(
        `Active role is ${ROLE_LABELS[role]}. Switch to Operator to test guardrail block.`,
      );
    }
  };

  // Filtered lists
  const openDisputes = disputes.filter((d) => d.status === "open");
  const pendingModerations = moderationCases.filter((m) => m.status === "pending");
  const operatorActivity = activity.filter(
    (a) =>
      a.kind.startsWith("operator.") ||
      a.kind.startsWith("billing.") ||
      a.kind.startsWith("org.") ||
      a.kind.startsWith("promo."),
  );

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      {/* Top Console Navigation */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-tight text-foreground">
                  PEWA Operator
                </span>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  Platform Operations
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Administrative oversight, compliance & commercial dispute resolution
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Active Role:</span>
              <span className="font-bold text-foreground">{ROLE_LABELS[role]}</span>
              {role !== "operator" ? (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  onClick={() => {
                    setRole("operator");
                    toast.success("Switched to PEWA Operator role");
                  }}
                >
                  <UserCheck className="mr-1 h-3 w-3" />
                  Act as Operator
                </Button>
              ) : (
                <Badge className="bg-emerald-600 text-white">Operator Active</Badge>
              )}
            </div>

            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link to="/admin">
                <Store className="mr-1.5 h-3.5 w-3.5" />
                Merchant Workspace
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link to="/">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Customer Home
              </Link>
            </Button>
          </div>
        </div>

        {/* Operator Technical Guardrails Notice */}
        <div className="border-t bg-amber-500/10 px-4 py-2.5 text-amber-900 dark:text-amber-200">
          <div className="mx-auto flex max-w-6xl items-center gap-2.5 text-xs sm:px-6">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="leading-snug">
              <strong>Technical Guardrails Enforced:</strong> The Operator role cannot accept orders
              on behalf of merchants, modify food prices, or declare kitchen ready states.
              Interventions are strictly bounded to tenant participation, commercial dispute
              credits, and moderation.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* KPI Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Registered Tenants</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {PLATFORM_TENANTS_CATALOG.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {currentOrgStatus === "suspended" ? "1 suspended" : "All active in good standing"}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Published Menus</span>
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {menus.filter((m) => m.status === "published").length || 3}
            </p>
            <p className="text-[11px] text-muted-foreground">Instant zero-barrier guest access</p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Open Disputes</span>
              <Coins
                className={`h-4 w-4 ${openDisputes.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}
              />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{openDisputes.length}</p>
            <p className="text-[11px] text-muted-foreground">Unit deduction audit cases</p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Content Flags</span>
              <AlertOctagon
                className={`h-4 w-4 ${
                  pendingModerations.length > 0 ? "text-rose-600" : "text-muted-foreground"
                }`}
              />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{pendingModerations.length}</p>
            <p className="text-[11px] text-muted-foreground">Allergen & policy reports</p>
          </div>
        </div>

        {/* Tabbed Console Interfaces */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="bg-card border shadow-sm">
              <TabsTrigger value="tenants" className="gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" />
                Tenants & Subscriptions
              </TabsTrigger>
              <TabsTrigger value="disputes" className="relative gap-1.5 text-xs">
                <Coins className="h-3.5 w-3.5" />
                Disputes & Credits
                {openDisputes.length > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {openDisputes.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="moderation" className="relative gap-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                Content Moderation
                {pendingModerations.length > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {pendingModerations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Campaign Integrity
              </TabsTrigger>
              <TabsTrigger value="guardrails" className="gap-1.5 text-xs">
                <Lock className="h-3.5 w-3.5" />
                Guardrails Audit
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Audit Logs
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: TENANTS & SUBSCRIPTIONS */}
          <TabsContent value="tenants" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Registered Tenant Organizations</h2>
                  <p className="text-xs text-muted-foreground">
                    Monitor participating merchants, active capacity, and manage bounded account
                    status.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tenants or brands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>

              <div className="mt-5 divide-y rounded-lg border">
                {PLATFORM_TENANTS_CATALOG.filter(
                  (t) =>
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.businessType.toLowerCase().includes(searchQuery.toLowerCase()),
                ).map((tenant) => {
                  const isCurrentActiveTenant = tenant.id === organisation?.id;
                  const tenantStatus: OrgStatus = isCurrentActiveTenant
                    ? currentOrgStatus
                    : "active";
                  const isSuspended = tenantStatus === "suspended";

                  return (
                    <div
                      key={tenant.id}
                      className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{tenant.name}</h3>
                          {isCurrentActiveTenant && (
                            <Badge variant="secondary" className="text-[10px]">
                              Active in Simulation
                            </Badge>
                          )}
                          <Badge
                            className={`text-[10px] ${
                              isSuspended
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                            }`}
                            variant="outline"
                          >
                            {isSuspended ? "Suspended" : "Active"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tenant.businessType} · {tenant.venueCount} venue(s) · Tier:{" "}
                          <span className="font-medium text-foreground">{tenant.tier}</span>
                        </p>
                        {isCurrentActiveTenant && (
                          <div className="flex items-center gap-3 pt-1 text-xs">
                            <span className="text-muted-foreground">Order Units:</span>
                            <span className="font-semibold text-foreground">
                              {orderPolicy.included} / {orderPolicy.includedMax} included
                            </span>
                            {orderPolicy.topUp > 0 && (
                              <span className="text-emerald-600 font-medium">
                                (+{orderPolicy.topUp} top-up)
                              </span>
                            )}
                            {orderPolicy.overdraftUsed > 0 && (
                              <span className="text-amber-600 font-medium">
                                ({orderPolicy.overdraftUsed} overdraft used)
                              </span>
                            )}
                          </div>
                        )}
                        {isSuspended && organisation?.statusNote && isCurrentActiveTenant && (
                          <p className="text-xs text-rose-600 italic">
                            Reason: {organisation.statusNote}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isCurrentActiveTenant ? (
                          isSuspended ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() => {
                                setOrganisationStatus(tenant.id, "active");
                                toast.success(`Tenant ${tenant.name} reactivated.`);
                              }}
                            >
                              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                              Reactivate Tenant
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                setSelectedTenantToSuspend({
                                  id: tenant.id,
                                  name: tenant.name,
                                  currentStatus: tenantStatus,
                                });
                              }}
                            >
                              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                              Suspend Tenant
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Pre-seeded Tenant
                          </span>
                        )}
                        <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                          <Link to="/admin">
                            Inspect
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: DISPUTES & CREDIT ADJUSTMENTS */}
          <TabsContent value="disputes" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Usage Disputes & Unit Adjustments</h2>
                  <p className="text-xs text-muted-foreground">
                    Review merchant claims regarding accidental double-accepts, connectivity
                    glitches, or order continuity claims.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-xs">
                  {openDisputes.length} Open Case(s)
                </Badge>
              </div>

              {disputes.length === 0 ? (
                <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
                  <Coins className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold">No dispute cases on record</p>
                  <p className="text-xs text-muted-foreground">
                    All unit deductions are reconciled cleanly.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {disputes.map((caseItem) => {
                    const isOpen = caseItem.status === "open";
                    return (
                      <div
                        key={caseItem.id}
                        className="rounded-lg border p-4 transition-colors hover:bg-muted/10"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-primary">
                                {caseItem.id}
                              </span>
                              <span className="text-xs font-semibold text-foreground">
                                {caseItem.merchantName}
                              </span>
                              <Badge
                                variant={isOpen ? "default" : "secondary"}
                                className={`text-[10px] ${
                                  isOpen
                                    ? "bg-amber-500 text-white hover:bg-amber-600"
                                    : caseItem.status === "resolved"
                                      ? "bg-emerald-600 text-white"
                                      : ""
                                }`}
                              >
                                {caseItem.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-foreground font-medium">
                              Ref: <span className="font-mono">{caseItem.orderReference}</span> —{" "}
                              {caseItem.reason}
                            </p>
                            <p
                              className="text-[11px] text-muted-foreground"
                              suppressHydrationWarning
                            >
                              Opened: {new Date(caseItem.openedAt).toLocaleString()}
                              {caseItem.resolvedAt && (
                                <span>
                                  {" "}
                                  · Resolved: {new Date(caseItem.resolvedAt).toLocaleString()}
                                </span>
                              )}
                            </p>
                            {caseItem.resolutionNote && (
                              <div className="rounded bg-muted/60 p-2 text-xs text-foreground">
                                <strong>Operator Note:</strong> {caseItem.resolutionNote}
                                {caseItem.adjustmentUnits ? (
                                  <span className="ml-2 font-bold text-emerald-600">
                                    (+{caseItem.adjustmentUnits} unit credit applied)
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {isOpen && (
                            <Button
                              size="sm"
                              className="shrink-0 text-xs"
                              onClick={() => {
                                setSelectedDispute(caseItem);
                                setDisputeResolution("resolved");
                                setAdjustmentUnits(1);
                                setDisputeNote(
                                  `Accidental double tap verified against event logs. Refunding 1 acceptance unit to ${caseItem.merchantName}.`,
                                );
                              }}
                            >
                              Review & Adjudicate
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: CONTENT MODERATION */}
          <TabsContent value="moderation" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Content Moderation & Complaints</h2>
                  <p className="text-xs text-muted-foreground">
                    Investigate customer reports regarding missing allergen warnings, misleading
                    claims, or policy violations.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-xs">
                  {pendingModerations.length} Pending Review
                </Badge>
              </div>

              {moderationCases.length === 0 ? (
                <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <p className="mt-2 text-sm font-semibold">Zero pending moderation reports</p>
                  <p className="text-xs text-muted-foreground">
                    Platform content is in good order.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {moderationCases.map((mod) => {
                    const isPending = mod.status === "pending";
                    return (
                      <div
                        key={mod.id}
                        className="rounded-lg border p-4 transition-colors hover:bg-muted/10"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-rose-600">
                                {mod.id}
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                Target: {mod.targetName} ({mod.targetType})
                              </span>
                              <Badge
                                variant={isPending ? "destructive" : "secondary"}
                                className="text-[10px]"
                              >
                                {mod.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-foreground font-medium">
                              Report: {mod.reportReason}
                            </p>
                            <p
                              className="text-[11px] text-muted-foreground"
                              suppressHydrationWarning
                            >
                              Flagged: {new Date(mod.flaggedAt).toLocaleString()}
                            </p>
                            {mod.actionTaken && (
                              <div className="rounded bg-muted/60 p-2 text-xs text-foreground">
                                <strong>Action Recorded:</strong> {mod.actionTaken}
                              </div>
                            )}
                          </div>

                          {isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:text-rose-400"
                              onClick={() => {
                                setSelectedModCase(mod);
                                setModActionText(
                                  "Merchant notified to update allergen declarations; notice acknowledged and corrected.",
                                );
                              }}
                            >
                              Resolve Complaint
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 4: CAMPAIGN INTEGRITY */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-bold">Sponsored Campaign Oversight</h2>
                <p className="text-xs text-muted-foreground">
                  Audit promotional campaigns across PEWA Home for integrity, honest pricing, and ad
                  standards.
                </p>
              </div>

              {campaigns.length === 0 ? (
                <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold">No active campaigns</p>
                  <p className="text-xs text-muted-foreground">
                    Launch a campaign from Merchant Promotions to review oversight here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {campaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="rounded-lg border p-4 transition-colors hover:bg-muted/10"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{camp.title}</h3>
                            <Badge
                              variant="outline"
                              className={
                                camp.active
                                  ? "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]"
                                  : "text-[10px]"
                              }
                            >
                              {camp.active ? "Active on Home" : "Paused by Operator/Merchant"}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {camp.badgeText}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{camp.tagline}</p>
                          <div className="flex flex-wrap gap-4 pt-2 text-xs">
                            <span>
                              Budget: <strong>${camp.budget}</strong>
                            </span>
                            <span>
                              Spent: <strong>${camp.spent}</strong>{" "}
                              <span className="text-[10px] text-muted-foreground italic">
                                (simulated exposure)
                              </span>
                            </span>
                            <span>
                              Impressions: <strong>{camp.impressions}</strong>
                            </span>
                            <span>
                              Clicks: <strong>{camp.clicks}</strong>{" "}
                              <span className="text-[10px] text-muted-foreground italic">
                                (engagement)
                              </span>
                            </span>
                            <span>
                              CTR:{" "}
                              <strong>
                                {camp.impressions > 0
                                  ? ((camp.clicks / camp.impressions) * 100).toFixed(1)
                                  : 0}
                                %
                              </strong>
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-xs"
                          onClick={() => {
                            toggleCampaign(camp.id);
                            toast.success(
                              `Campaign “${camp.title}” ${camp.active ? "paused" : "resumed"}`,
                            );
                          }}
                        >
                          {camp.active ? (
                            <>
                              <Pause className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                              Pause Campaign
                            </>
                          ) : (
                            <>
                              <Play className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                              Resume Campaign
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 5: GUARDRAILS AUDIT */}
          <TabsContent value="guardrails" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Operator Guardrails Verification & Demonstration
                </h2>
                <p className="text-xs text-muted-foreground">
                  Verify the strict technical separation of concerns required by Section 12 & Slice
                  P6. The platform operator is architecturally prohibited from performing merchant
                  operations.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Guardrail 1 */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h3 className="text-sm font-bold">1. Order Acceptance Guardrail</h3>
                  </div>
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                    Platform operators cannot accept or decline order requests on behalf of
                    merchants. Only authorized merchant personnel have kitchen authority.
                  </p>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full text-xs"
                      onClick={handleGuardrailOrderAttempt}
                    >
                      Simulate Operator Accept Order
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground text-center">
                    Enforces: 403 Forbidden / Role check
                  </p>
                </div>

                {/* Guardrail 2 */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h3 className="text-sm font-bold">2. Menu Pricing Guardrail</h3>
                  </div>
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                    Operators cannot edit menu prices or change offering descriptions. Commercial
                    pricing is owned solely by merchant business managers and owners.
                  </p>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full text-xs"
                      onClick={handleGuardrailPriceAttempt}
                    >
                      Simulate Operator Price Edit
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground text-center">
                    Enforces: Menu authoring prohibition
                  </p>
                </div>

                {/* Guardrail 3 */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h3 className="text-sm font-bold">3. Kitchen Ready State Guardrail</h3>
                  </div>
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                    Operators cannot mark dishes or orders as Ready in the kitchen. Physical food
                    fulfillment belongs exclusively to on-premise staff.
                  </p>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full text-xs"
                      onClick={handleGuardrailReadyAttempt}
                    >
                      Simulate Operator Mark Ready
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground text-center">
                    Enforces: Kitchen fulfillment separation
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 6: AUDIT ACTIVITY LOG */}
          <TabsContent value="activity" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Platform Operator Audit Feed</h2>
                  <p className="text-xs text-muted-foreground">
                    Chronological audit log of administrative decisions, dispute adjudications, and
                    account status changes.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {operatorActivity.length} Events
                </Badge>
              </div>

              {operatorActivity.length === 0 ? (
                <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
                  <History className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold">No operator audit events logged yet</p>
                  <p className="text-xs text-muted-foreground">
                    Resolving a dispute or updating a tenant status will record an immutable entry
                    here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {operatorActivity.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between rounded-lg border bg-muted/20 p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-primary">{event.kind}</span>
                          <span className="text-muted-foreground">by</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {ROLE_LABELS[event.role] || event.role}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground">{event.message}</p>
                      </div>
                      <span
                        className="shrink-0 text-[11px] text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {new Date(event.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* MODAL: Dispute Resolution & Unit Credit Adjustment */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Usage Dispute Adjudication</DialogTitle>
            <DialogDescription>
              Review unit consumption claim for {selectedDispute?.merchantName} (Case:{" "}
              {selectedDispute?.id}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p>
                <strong>Order Reference:</strong> {selectedDispute?.orderReference}
              </p>
              <p>
                <strong>Reported Issue:</strong> {selectedDispute?.reason}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Resolution Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={disputeResolution === "resolved" ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setDisputeResolution("resolved")}
                >
                  <Coins className="mr-1.5 h-3.5 w-3.5" />
                  Grant Credit Adjustment
                </Button>
                <Button
                  type="button"
                  variant={disputeResolution === "dismissed" ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setDisputeResolution("dismissed")}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Dismiss Claim
                </Button>
              </div>
            </div>

            {disputeResolution === "resolved" && (
              <div className="space-y-2">
                <Label htmlFor="adjustment-units" className="text-xs font-semibold">
                  Units to Credit to Included Balance
                </Label>
                <div className="flex gap-2">
                  {[1, 2, 5, 10].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={adjustmentUnits === num ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 text-xs font-bold"
                      onClick={() => setAdjustmentUnits(num)}
                    >
                      +{num}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dispute-notes" className="text-xs font-semibold">
                Compliance Audit Note (Required)
              </Label>
              <Textarea
                id="dispute-notes"
                placeholder="Explain the technical or commercial rationale for this adjustment..."
                value={disputeNote}
                onChange={(e) => setDisputeNote(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedDispute(null)}
            >
              Cancel
            </Button>
            <Button size="sm" className="text-xs" onClick={handleApplyDisputeResolution}>
              Record & Apply Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Suspend Tenant */}
      <Dialog
        open={!!selectedTenantToSuspend}
        onOpenChange={(open) => !open && setSelectedTenantToSuspend(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend Tenant Access</DialogTitle>
            <DialogDescription>
              Temporary suspension of {selectedTenantToSuspend?.name} for policy compliance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Suspending this tenant will temporarily restrict order submission while leaving public
              menus visible with direct contact options.
            </p>
            <div className="space-y-2">
              <Label htmlFor="suspend-notes" className="text-xs font-semibold">
                Suspension Reason (Required)
              </Label>
              <Textarea
                id="suspend-notes"
                placeholder="e.g., Unresolved severe allergen complaint pending verification..."
                value={suspensionNote}
                onChange={(e) => setSuspensionNote(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedTenantToSuspend(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={() => handleApplyTenantStatus("suspended")}
            >
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Moderation Resolution */}
      <Dialog open={!!selectedModCase} onOpenChange={(open) => !open && setSelectedModCase(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Moderation Complaint</DialogTitle>
            <DialogDescription>
              Case {selectedModCase?.id}: {selectedModCase?.targetName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p>
                <strong>Complaint:</strong> {selectedModCase?.reportReason}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mod-action" className="text-xs font-semibold">
                Corrective Action / Resolution Note
              </Label>
              <Textarea
                id="mod-action"
                placeholder="Describe corrective actions taken with merchant..."
                value={modActionText}
                onChange={(e) => setModActionText(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedModCase(null)}
            >
              Cancel
            </Button>
            <Button size="sm" className="text-xs" onClick={handleApplyModeration}>
              Complete Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
