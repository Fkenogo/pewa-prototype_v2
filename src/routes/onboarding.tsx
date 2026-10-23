import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Globe,
  Info,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getActiveOrganisationMembership, ROLE_LABELS, usePewa } from "@/lib/pewa/store";
import { SUGGESTED_BUSINESS_CATEGORIES } from "@/lib/pewa/taxonomy";
import type {
  ContactVisibility,
  OnboardingDraft,
  PreferredSignInIdentifier,
} from "@/lib/pewa/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — PEWA" },
      {
        name: "description",
        content:
          "Register your personal identity, organisation, and first business location on PEWA.",
      },
      { property: "og:title", content: "Set up your business — PEWA" },
      {
        property: "og:description",
        content:
          "Register your personal identity, organisation, and first business location on PEWA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const SERVICES = ["Dine-in", "Takeaway", "Delivery"];
const CURRENCIES = ["KES", "UGX", "TZS", "USD", "EUR", "GBP"];
const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Other"];

const STEP_LABELS = [
  "Personal details",
  "Organisation details",
  "Business presence",
  "Location & service",
  "Review & create",
];

function createDefaultDraft(existingIdentity?: {
  fullName?: string;
  email?: string;
  mobile?: string;
  preferredSignIn?: PreferredSignInIdentifier;
  verifiedSimulation?: boolean;
}): OnboardingDraft {
  return {
    step: 0,
    fullName: existingIdentity?.fullName || "",
    personalEmail: existingIdentity?.email || "",
    personalMobile: existingIdentity?.mobile || "",
    preferredSignIn: existingIdentity?.preferredSignIn || "email",
    verificationSimulated: Boolean(existingIdentity?.verifiedSimulation),
    orgName: "",
    tradingName: "",
    category: "Café",
    businessType: "Café",
    isCustomCategory: false,
    customCategoryInput: "",
    country: "Kenya",
    currency: "KES",
    primaryBusinessContact: "",
    primaryContactVisibility: "private",
    venueName: "",
    tagline: "",
    brandBadge: "",
    phone: "",
    whatsapp: "",
    email: "",
    deliveryOnly: false,
    address: "",
    serviceArea: "",
    services: ["Dine-in", "Takeaway"],
    servicePointName: "Main Dining",
    additionalServiceContexts: [],
    menuName: "All-Day Menu",
  };
}

function Onboarding() {
  const navigate = useNavigate();
  const {
    organisation,
    venues,
    menus,
    personalIdentity,
    memberships,
    onboardingDraft,
    saveOnboardingDraft,
    clearOnboardingDraft,
    upsertPersonalIdentity,
    completeOnboarding,
  } = usePewa();

  const [registerAnotherOrg, setRegisterAnotherOrg] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{
    menuId: string;
    orgName: string;
    venueName: string;
    ownerName: string;
  } | null>(null);
  const [newContextInput, setNewContextInput] = useState("");

  const [f, setF] = useState<OnboardingDraft>(() => {
    if (onboardingDraft) {
      return onboardingDraft;
    }
    return createDefaultDraft(personalIdentity || undefined);
  });

  // Persist draft changes to the store so in-progress onboarding survives navigation/reloads
  useEffect(() => {
    if (!createdSummary && (!organisation || registerAnotherOrg)) {
      saveOnboardingDraft(f);
    }
  }, [f, createdSummary, organisation, registerAnotherOrg, saveOnboardingDraft]);

  const step = f.step;
  const setField = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
  };

  const effectiveCategory = f.isCustomCategory ? f.customCategoryInput.trim() : f.category;
  const isHotelCategory =
    effectiveCategory.toLowerCase().includes("hotel") ||
    f.businessType.toLowerCase().includes("hotel");

  // Validation per step with clear user guidance
  const hasPersonalContact =
    f.personalEmail.trim().length > 2 || f.personalMobile.trim().length > 4;
  const preferredContactValid =
    f.preferredSignIn === "email"
      ? f.personalEmail.trim().length > 2
      : f.personalMobile.trim().length > 4;

  const step0Valid =
    f.fullName.trim().length > 1 &&
    hasPersonalContact &&
    preferredContactValid &&
    f.verificationSimulated;

  const step1Valid =
    f.orgName.trim().length > 1 &&
    effectiveCategory.length > 1 &&
    f.country.trim().length > 1 &&
    f.primaryBusinessContact.trim().length > 2;

  const effectiveVenueName = (f.venueName || f.tradingName || f.orgName).trim();
  const hasCustomerContact =
    f.phone.trim().length > 2 || f.whatsapp.trim().length > 2 || f.email.trim().length > 2;

  const step2Valid = effectiveVenueName.length > 1 && hasCustomerContact;

  const hasLocationOrCoverage = f.deliveryOnly
    ? (f.serviceArea || f.address).trim().length > 1
    : f.address.trim().length > 1;
  const hasServices = f.deliveryOnly || f.services.length > 0;

  const step3Valid = hasLocationOrCoverage && hasServices && f.menuName.trim().length > 1;

  const step4Valid = step0Valid && step1Valid && step2Valid && step3Valid;

  const valid = [step0Valid, step1Valid, step2Valid, step3Valid, step4Valid][step] ?? false;

  const validationHint = (() => {
    if (step === 0) {
      if (f.fullName.trim().length <= 1)
        return "Enter your full name to establish your personal identity.";
      if (!preferredContactValid) {
        return f.preferredSignIn === "email"
          ? "Provide an email address for your preferred email sign-in."
          : "Provide a mobile number for your preferred mobile sign-in.";
      }
      if (!f.verificationSimulated) {
        return "Complete the simulated identity verification check to continue.";
      }
      return null;
    }
    if (step === 1) {
      if (f.orgName.trim().length <= 1) return "Enter your legal or primary organisation name.";
      if (effectiveCategory.length <= 1) return "Select or enter a business category.";
      if (f.primaryBusinessContact.trim().length <= 2)
        return "Provide a primary organisation contact for business administration.";
      return null;
    }
    if (step === 2) {
      if (effectiveVenueName.length <= 1) return "Enter the customer-facing business name.";
      if (!hasCustomerContact)
        return "Add at least one customer contact channel (WhatsApp, phone, or email).";
      return null;
    }
    if (step === 3) {
      if (!hasLocationOrCoverage) {
        return f.deliveryOnly
          ? "Enter your delivery service area (no walk-in address required)."
          : "Enter your street address or storefront location.";
      }
      if (!hasServices) return "Select at least one applicable service mode.";
      if (f.menuName.trim().length <= 1) return "Enter a name for your first menu.";
      return null;
    }
    return null;
  })();

  const activeMembership = getActiveOrganisationMembership({
    personalIdentity,
    organisation,
    memberships,
  });

  // Requirement 5 & Scenario I: Returning business owner entry experience
  // If an organisation already exists and the user hasn't explicitly chosen to register another organisation,
  // present a clear returning-owner entry card instead of creating a duplicate organisation.
  if (organisation && !registerAnotherOrg && !createdSummary) {
    const orgVenues = venues.filter((v) => v.orgId === organisation.id);
    const orgMenus = menus.filter((m) => m.orgId === organisation.id);
    const primaryMenu = orgMenus[0];

    return (
      <main
        data-testid="returning-owner-entry"
        className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12"
      >
        <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Existing Business Workspace
              </span>
              <h1 className="mt-1 text-2xl font-bold truncate">{organisation.name}</h1>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Welcome back{personalIdentity ? `, ${personalIdentity.fullName}` : ""}. Your
            organisation is already registered on PEWA. Resume your active workspace or continue
            editing your menus without creating duplicate records.
          </p>

          <div className="rounded-xl border bg-muted/40 p-3.5 text-xs space-y-1.5">
            {personalIdentity && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Personal identity:</span>
                <span className="font-semibold text-foreground">
                  {personalIdentity.fullName} (
                  {personalIdentity.preferredSignIn === "email"
                    ? personalIdentity.email
                    : personalIdentity.mobile}
                  )
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Active membership role:</span>
              <span className="font-semibold text-primary">
                {ROLE_LABELS[activeMembership?.role || "owner"]}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Configured locations:</span>
              <span className="font-medium text-foreground">
                {orgVenues.map((v) => v.name).join(", ") || "1 venue"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Menus in workspace:</span>
              <span className="font-medium text-foreground">{orgMenus.length}</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <Button
              size="lg"
              className="h-12 w-full text-sm font-semibold"
              onClick={() => navigate({ to: "/admin" })}
            >
              Resume Business Workspace <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            {primaryMenu && (
              <Button
                variant="outline"
                size="lg"
                className="h-11 w-full text-sm font-semibold"
                onClick={() =>
                  navigate({
                    to: "/admin/menus/$menuId",
                    params: { menuId: primaryMenu.id },
                  })
                }
              >
                Continue editing “{primaryMenu.name}”
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                const freshDraft = createDefaultDraft(personalIdentity || undefined);
                setF(freshDraft);
                saveOnboardingDraft(freshDraft);
                setRegisterAnotherOrg(true);
              }}
            >
              Register a separate new organisation under your identity
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Requirement 6: Post-creation completion & Invitation handoff screen
  if (createdSummary) {
    return (
      <main
        data-testid="onboarding-completion-handoff"
        className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12"
      >
        <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Organisation Registered
              </span>
              <h1 className="mt-0.5 text-2xl font-bold">{createdSummary.orgName}</h1>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Your founding <b>Organisation Owner</b> membership is active for{" "}
            <b>{createdSummary.ownerName}</b>, and your initial location (
            <b>{createdSummary.venueName}</b>) and draft menu are ready.
          </p>

          {/* Contextual Next-Step Action: Invite your team (R3-A Requirement 6) */}
          <section
            aria-label="Invite your team"
            className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Invite your team</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Set up role-scoped access for <b>{createdSummary.orgName}</b> in Team Management.
              Invitations are simulated in this prototype; no external email or SMS is sent.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 w-full text-xs font-semibold"
            >
              <Link to="/admin/team">
                <Users className="mr-1.5 h-3.5 w-3.5" /> Open Team Management
              </Link>
            </Button>
          </section>

          <div className="space-y-2.5 pt-2">
            <Button
              size="lg"
              className="h-12 w-full text-sm font-semibold"
              onClick={() =>
                navigate({
                  to: "/admin/menus/$menuId",
                  params: { menuId: createdSummary.menuId },
                })
              }
            >
              Continue to Menu Builder <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 w-full text-sm font-semibold"
              onClick={() => navigate({ to: "/admin" })}
            >
              Open Business Workspace
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const handleNext = () => {
    if (!valid) return;

    if (step === 0) {
      // Persist reusable personal identity on completing Step A
      upsertPersonalIdentity({
        fullName: f.fullName.trim(),
        email: f.personalEmail.trim(),
        mobile: f.personalMobile.trim(),
        preferredSignIn: f.preferredSignIn,
        verifiedSimulation: f.verificationSimulated,
      });
      // Pre-fill primary business contact and customer contact defaults if still empty
      const defaultContact =
        f.preferredSignIn === "email"
          ? f.personalEmail.trim() || f.personalMobile.trim()
          : f.personalMobile.trim() || f.personalEmail.trim();
      setF((prev) => ({
        ...prev,
        step: 1,
        primaryBusinessContact: prev.primaryBusinessContact || defaultContact,
        phone: prev.phone || prev.personalMobile.trim(),
        whatsapp: prev.whatsapp || prev.personalMobile.trim(),
        email: prev.email || prev.personalEmail.trim(),
      }));
      return;
    }

    if (step === 1) {
      const cat = f.isCustomCategory ? f.customCategoryInput.trim() : f.category;
      const autoDeliveryOnly =
        cat.toLowerCase().includes("delivery") || f.businessType.toLowerCase().includes("delivery");
      const autoHotel =
        cat.toLowerCase().includes("hotel") || f.businessType.toLowerCase().includes("hotel");
      setF((prev) => ({
        ...prev,
        step: 2,
        venueName: prev.venueName || prev.tradingName.trim() || prev.orgName.trim(),
        deliveryOnly: autoDeliveryOnly ? true : prev.deliveryOnly,
        servicePointName:
          autoHotel && prev.servicePointName === "Main Dining"
            ? "Lobby Lounge & Bar"
            : autoDeliveryOnly && prev.servicePointName === "Main Dining"
              ? "Dispatch Kitchen"
              : prev.servicePointName,
        additionalServiceContexts:
          autoHotel && prev.additionalServiceContexts.length === 0
            ? ["In-Room Dining (Guests Only)", "Pool Terrace"]
            : prev.additionalServiceContexts,
        // Only copy primary contact into public channels if explicitly marked public
        phone:
          prev.primaryContactVisibility === "public" &&
          !prev.phone &&
          !prev.primaryBusinessContact.includes("@")
            ? prev.primaryBusinessContact
            : prev.phone,
        email:
          prev.primaryContactVisibility === "public" &&
          !prev.email &&
          prev.primaryBusinessContact.includes("@")
            ? prev.primaryBusinessContact
            : prev.email,
      }));
      return;
    }

    if (step === 2) {
      setF((prev) => ({
        ...prev,
        step: 3,
        venueName: (prev.venueName || prev.tradingName || prev.orgName).trim(),
      }));
      return;
    }

    if (step === 3) {
      setF((prev) => ({ ...prev, step: 4 }));
      return;
    }

    // Step 4 (Step E — Review & Create)
    const menuId = completeOnboarding({
      identity: {
        fullName: f.fullName.trim(),
        email: f.personalEmail.trim(),
        mobile: f.personalMobile.trim(),
        preferredSignIn: f.preferredSignIn,
        verifiedSimulation: f.verificationSimulated,
      },
      orgName: f.orgName.trim(),
      tradingName: f.tradingName.trim() || undefined,
      businessType: effectiveCategory,
      category: effectiveCategory,
      country: f.country,
      currency: f.currency,
      primaryBusinessContact: f.primaryBusinessContact.trim(),
      primaryContactVisibility: f.primaryContactVisibility,
      venueName: effectiveVenueName,
      tagline: f.tagline.trim(),
      brandBadge: f.brandBadge.trim() || undefined,
      phone: f.phone.trim(),
      whatsapp: f.whatsapp.trim(),
      email: f.email.trim(),
      deliveryOnly: f.deliveryOnly,
      address: f.deliveryOnly ? "" : f.address.trim(),
      serviceArea: f.deliveryOnly ? (f.serviceArea || f.address).trim() : f.serviceArea.trim(),
      services: f.deliveryOnly ? ["Delivery"] : f.services,
      servicePointName: f.servicePointName.trim(),
      additionalServiceContexts: f.additionalServiceContexts,
      menuName: f.menuName.trim(),
    });

    clearOnboardingDraft();
    setCreatedSummary({
      menuId,
      orgName: f.orgName.trim(),
      venueName: effectiveVenueName,
      ownerName: f.fullName.trim(),
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pt-5 pb-12">
      {/* Top Progress Header (padded right so ScenarioPanel pill never overlaps at 360px/390px) */}
      <div className="mb-4 flex items-center gap-2 pr-28">
        <button
          type="button"
          onClick={() => (step > 0 ? setField("step", step - 1) : navigate({ to: "/" }))}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Step {step + 1} of {STEP_LABELS.length}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{STEP_LABELS[step]}</p>
        </div>
      </div>

      {/* Step Indicator Bars */}
      <div
        className="mb-6 flex gap-1.5"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={5}
      >
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={i > step}
            onClick={() => i < step && setField("step", i)}
            aria-label={`Go to step ${i + 1}: ${label}`}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-primary" : "bg-muted",
              i < step && "cursor-pointer hover:bg-primary/80",
            )}
          />
        ))}
      </div>

      <div className="flex-1 space-y-5">
        {/* STEP A — PERSONAL DETAILS & REUSABLE IDENTITY */}
        {step === 0 && (
          <section data-testid="onboarding-step-personal" className="space-y-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <UserCheck className="h-3.5 w-3.5" /> Step A · Personal Identity
              </span>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Create your personal identity</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Your personal identity is separate from your business and can hold memberships
                across multiple organisations.
              </p>
            </div>

            {personalIdentity && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">
                    Reusable identity detected: {personalIdentity.fullName}
                  </p>
                  <p className="text-muted-foreground">
                    {personalIdentity.email || personalIdentity.mobile}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  onClick={() => {
                    setF((prev) => ({
                      ...prev,
                      fullName: personalIdentity.fullName,
                      personalEmail: personalIdentity.email,
                      personalMobile: personalIdentity.mobile,
                      preferredSignIn: personalIdentity.preferredSignIn,
                      verificationSimulated: true,
                    }));
                  }}
                >
                  Use identity
                </Button>
              </div>
            )}

            <Field
              label="Full name"
              value={f.fullName}
              onChange={(v) => setField("fullName", v)}
              placeholder="e.g. Wanjiku Mwangi"
              autoFocus
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Email address"
                type="email"
                value={f.personalEmail}
                onChange={(v) => setField("personalEmail", v)}
                placeholder="you@example.com"
              />
              <Field
                label="Mobile number"
                type="tel"
                value={f.personalMobile}
                onChange={(v) => setField("personalMobile", v)}
                placeholder="+254 712 345 678"
              />
            </div>

            <div>
              <Label className="mb-2 block text-xs font-semibold">
                Preferred sign-in identifier
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Choice
                  active={f.preferredSignIn === "email"}
                  onClick={() => setField("preferredSignIn", "email")}
                >
                  <span>Email sign-in</span>
                </Choice>
                <Choice
                  active={f.preferredSignIn === "mobile"}
                  onClick={() => setField("preferredSignIn", "mobile")}
                >
                  <span>Mobile sign-in</span>
                </Choice>
              </div>
            </div>

            {/* Simulated Identity Verification Box */}
            <div className="rounded-xl border bg-card p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <ShieldCheck
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      f.verificationSimulated ? "text-emerald-600" : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Simulated Identity Verification
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Prototype simulation only — no real email or SMS OTP is transmitted.
                    </p>
                  </div>
                </div>
                {f.verificationSimulated && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Verified (Simulated)
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant={f.verificationSimulated ? "secondary" : "default"}
                size="sm"
                data-testid="simulate-verify-identity-btn"
                className="h-9 w-full text-xs font-semibold"
                disabled={f.fullName.trim().length <= 1 || !preferredContactValid}
                onClick={() => {
                  setField("verificationSimulated", true);
                  toast.success("Prototype identity verification simulated.");
                }}
              >
                {f.verificationSimulated
                  ? "✓ Identity verification simulated"
                  : `Simulate verification for ${f.preferredSignIn === "email" ? "email" : "mobile"}`}
              </Button>
            </div>
          </section>
        )}

        {/* STEP B — ORGANISATION DETAILS */}
        {step === 1 && (
          <section data-testid="onboarding-step-organisation" className="space-y-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <Building2 className="h-3.5 w-3.5" /> Step B · Organisation Details
              </span>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Register your organisation</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                You will be assigned as the founding <b>Organisation Owner</b>.
              </p>
            </div>

            <Field
              label="Organisation name"
              value={f.orgName}
              onChange={(v) => setField("orgName", v)}
              placeholder="e.g. Mama Njeri Hospitality Ltd"
              autoFocus
            />

            <Field
              label="Trading / business name (optional if same)"
              value={f.tradingName}
              onChange={(v) => setField("tradingName", v)}
              placeholder="e.g. Mama Njeri's Kitchen"
            />

            <div>
              <Label className="mb-2 block text-xs font-semibold">Business category & type</Label>
              <div className="grid gap-2">
                {SUGGESTED_BUSINESS_CATEGORIES.map((c) => (
                  <Choice
                    key={c.id}
                    active={!f.isCustomCategory && f.category === c.label}
                    onClick={() => {
                      setF((prev) => ({
                        ...prev,
                        isCustomCategory: false,
                        category: c.label,
                        businessType: c.label,
                        deliveryOnly:
                          c.id === "delivery-only" || c.label.toLowerCase().includes("delivery"),
                      }));
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">{c.label}</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        {c.description}
                      </div>
                    </div>
                  </Choice>
                ))}
                <Choice
                  active={f.isCustomCategory}
                  onClick={() => setField("isCustomCategory", true)}
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">Custom category...</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Type your own category (e.g. Swahili Street Food, Pastry Bar)
                    </div>
                  </div>
                </Choice>
              </div>

              {f.isCustomCategory && (
                <div className="mt-3">
                  <Label className="mb-1.5 block text-xs">Enter custom category</Label>
                  <Input
                    value={f.customCategoryInput}
                    onChange={(e) => setField("customCategoryInput", e.target.value)}
                    placeholder="e.g. Swahili Coastal Dining"
                    className="h-11"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold">Country</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COUNTRIES.map((c) => (
                    <Choice key={c} active={f.country === c} onClick={() => setField("country", c)}>
                      <span className="text-xs">{c}</span>
                    </Choice>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold">Operating currency</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CURRENCIES.map((c) => (
                    <Choice
                      key={c}
                      active={f.currency === c}
                      onClick={() => setField("currency", c)}
                    >
                      <span className="text-xs">{c}</span>
                    </Choice>
                  ))}
                </div>
              </div>
            </div>

            <Field
              label="Primary organisation contact (email or phone)"
              value={f.primaryBusinessContact}
              onChange={(v) => setField("primaryBusinessContact", v)}
              placeholder="e.g. admin@mamanjeri.co.ke or +254700000000"
            />

            <div className="rounded-xl border bg-card p-3.5 space-y-2">
              <Label className="block text-xs font-semibold">
                Primary organisation contact visibility
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Choice
                  active={f.primaryContactVisibility === "private"}
                  onClick={() => setField("primaryContactVisibility", "private")}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Private (Admin only)</span>
                  </div>
                </Choice>
                <Choice
                  active={f.primaryContactVisibility === "public"}
                  onClick={() => setField("primaryContactVisibility", "public")}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Public on menu</span>
                  </div>
                </Choice>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {f.primaryContactVisibility === "private"
                  ? "Kept private for organisation administration and never exposed on customer menus."
                  : "Can be shared with customers alongside your venue contact channels."}
              </p>
            </div>
          </section>
        )}

        {/* STEP C — BUSINESS PRESENCE */}
        {step === 2 && (
          <section data-testid="onboarding-step-presence" className="space-y-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <Store className="h-3.5 w-3.5" /> Step C · Business Presence
              </span>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Customer-facing presence</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure how customers discover and contact your business on PEWA.
              </p>
            </div>

            <Field
              label="Customer-facing business name"
              value={f.venueName}
              onChange={(v) => setField("venueName", v)}
              placeholder={f.tradingName || f.orgName || "e.g. Mama Njeri's Kitchen"}
            />

            <div>
              <Label htmlFor="field-tagline" className="mb-1.5 block text-sm">
                Short description / tagline (optional)
              </Label>
              <Textarea
                id="field-tagline"
                value={f.tagline}
                onChange={(e) => setField("tagline", e.target.value)}
                placeholder="e.g. Freshly roasted single-origin coffee & warm pastries daily"
                rows={2}
                className="text-sm"
              />
            </div>

            <Field
              label="Brand monogram or logo badge (optional)"
              value={f.brandBadge}
              onChange={(v) => setField("brandBadge", v)}
              placeholder={`e.g. ${(effectiveVenueName[0] || "P").toUpperCase()} or ☕`}
            />

            <div>
              <Label className="mb-2 block text-xs font-semibold">Operating model</Label>
              <div className="grid grid-cols-2 gap-2">
                <Choice active={!f.deliveryOnly} onClick={() => setField("deliveryOnly", false)}>
                  <div className="text-left">
                    <div className="font-semibold text-xs">Physical location</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      Walk-in storefront, café, restaurant, or hotel
                    </div>
                  </div>
                </Choice>
                <Choice
                  active={f.deliveryOnly}
                  onClick={() => {
                    setF((prev) => ({
                      ...prev,
                      deliveryOnly: true,
                      services: ["Delivery"],
                    }));
                  }}
                >
                  <div className="text-left">
                    <div className="font-semibold text-xs">Delivery-only</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      Cloud kitchen or dispatch hub (no walk-in)
                    </div>
                  </div>
                </Choice>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3.5 space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Public customer contact channels
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Provide at least one direct channel for customer inquiries and orders.
                </p>
              </div>
              <Field
                label="Customer WhatsApp number"
                value={f.whatsapp}
                onChange={(v) => setField("whatsapp", v)}
                placeholder="+254 7…"
                type="tel"
              />
              <Field
                label="Customer phone line"
                value={f.phone}
                onChange={(v) => setField("phone", v)}
                placeholder="+254 7…"
                type="tel"
              />
              <Field
                label="Public inquiry email (optional)"
                value={f.email}
                onChange={(v) => setField("email", v)}
                placeholder="orders@example.com"
                type="email"
              />
            </div>
          </section>
        )}

        {/* STEP D — LOCATION AND SERVICE CONFIGURATION */}
        {step === 3 && (
          <section data-testid="onboarding-step-location" className="space-y-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5" /> Step D · Location & Service Context
              </span>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                {f.deliveryOnly ? "Configure delivery coverage" : "Configure location & service"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {f.deliveryOnly
                  ? "No walk-in storefront address is required for delivery-only businesses."
                  : "Set your initial location address, service modes, and first menu context."}
              </p>
            </div>

            {f.deliveryOnly ? (
              <div className="space-y-2">
                <Field
                  label="Declared delivery service area"
                  value={f.serviceArea || f.address}
                  onChange={(v) => {
                    setF((prev) => ({ ...prev, serviceArea: v, address: v }));
                  }}
                  placeholder="e.g. Kilimani, Lavington & Westlands"
                />
                <p className="text-xs text-muted-foreground">
                  Customers will see <b>Delivers to {f.serviceArea || f.address || "..."}</b> and a{" "}
                  <b>No walk-in storefront</b> notice.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Field
                  label="Street address & neighbourhood"
                  value={f.address}
                  onChange={(v) => setField("address", v)}
                  placeholder="e.g. 14 Moi Avenue, CBD, Nairobi"
                />
                <div>
                  <Label className="mb-2 block text-xs font-semibold">
                    Applicable service modes
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map((s) => (
                      <Choice
                        key={s}
                        active={f.services.includes(s)}
                        onClick={() =>
                          setField(
                            "services",
                            f.services.includes(s)
                              ? f.services.filter((x) => x !== s)
                              : [...f.services, s],
                          )
                        }
                      >
                        {s}
                      </Choice>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Service Point / Multi-Context Structure (Supports Cafés, Multi-branch & Hotels) */}
            <div className="rounded-xl border bg-card p-3.5 space-y-3">
              <div>
                <Label htmlFor="field-service-point" className="text-xs font-semibold">
                  Initial service point or menu context
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {isHotelCategory
                    ? "Hotels can define multiple guest service contexts (e.g. Lobby Bar, Pool Terrace, In-Room Dining)."
                    : "Name your primary dining or dispatch context. You can add more locations or contexts anytime."}
                </p>
              </div>

              <Input
                id="field-service-point"
                value={f.servicePointName}
                onChange={(e) => setField("servicePointName", e.target.value)}
                placeholder={
                  isHotelCategory
                    ? "e.g. Lobby Lounge & Bar"
                    : f.deliveryOnly
                      ? "e.g. Central Dispatch Kitchen"
                      : "e.g. Main Dining Room"
                }
                className="h-10 text-sm"
              />

              {/* Additional service contexts (especially useful for Hotels / Hospitality) */}
              <div className="space-y-2">
                <Label
                  htmlFor="field-new-context"
                  className="text-[11px] text-muted-foreground font-medium"
                >
                  Additional service contexts (optional — e.g. In-Room Dining, Rooftop Bar)
                </Label>
                {f.additionalServiceContexts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {f.additionalServiceContexts.map((ctx) => (
                      <span
                        key={ctx}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {ctx}
                        <button
                          type="button"
                          aria-label={`Remove context ${ctx}`}
                          onClick={() =>
                            setField(
                              "additionalServiceContexts",
                              f.additionalServiceContexts.filter((x) => x !== ctx),
                            )
                          }
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <Input
                    id="field-new-context"
                    value={newContextInput}
                    onChange={(e) => setNewContextInput(e.target.value)}
                    placeholder="Add context (e.g. In-Room Dining)"
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 text-xs"
                    onClick={() => {
                      const clean = newContextInput.trim();
                      if (!clean) return;
                      if (!f.additionalServiceContexts.includes(clean)) {
                        setField("additionalServiceContexts", [
                          ...f.additionalServiceContexts,
                          clean,
                        ]);
                      }
                      setNewContextInput("");
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
            </div>

            {/* First Menu Name */}
            <div className="space-y-2">
              <Field
                label="First menu name"
                value={f.menuName}
                onChange={(v) => setField("menuName", v)}
              />
              <div className="flex flex-wrap gap-1.5">
                {["All-Day Menu", "Breakfast & Coffee", "Delivery Menu", "Lobby & Bar Menu"].map(
                  (t) => (
                    <Choice
                      key={t}
                      active={f.menuName === t}
                      onClick={() => setField("menuName", t)}
                    >
                      <span className="text-xs">{t}</span>
                    </Choice>
                  ),
                )}
              </div>
            </div>
          </section>
        )}

        {/* STEP E — REVIEW AND CREATION */}
        {step === 4 && (
          <section data-testid="onboarding-step-review" className="space-y-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Step E · Review & Create
              </span>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Review your setup</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Verify your details below. You can jump back to any step to make corrections before
                creating your organisation.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Summary Block A: Identity */}
              <div className="rounded-xl border bg-card p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">1. Personal Identity & Role</span>
                  <button
                    type="button"
                    onClick={() => setField("step", 0)}
                    className="font-semibold text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p>
                  <b>Name:</b> {f.fullName} · <b>Role:</b> Organisation Owner (Founding)
                </p>
                <p className="text-muted-foreground">
                  <b>Sign-in ({f.preferredSignIn}):</b>{" "}
                  {f.preferredSignIn === "email" ? f.personalEmail : f.personalMobile} · Verified
                  (Simulated)
                </p>
              </div>

              {/* Summary Block B: Organisation */}
              <div className="rounded-xl border bg-card p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">2. Organisation Details</span>
                  <button
                    type="button"
                    onClick={() => setField("step", 1)}
                    className="font-semibold text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p>
                  <b>Organisation:</b> {f.orgName}
                  {f.tradingName && f.tradingName !== f.orgName
                    ? ` (Trading as ${f.tradingName})`
                    : ""}
                </p>
                <p className="text-muted-foreground">
                  <b>Category:</b> {effectiveCategory} · <b>Country:</b> {f.country} ({f.currency})
                </p>
                <p className="text-muted-foreground">
                  <b>Admin contact:</b> {f.primaryBusinessContact} (
                  {f.primaryContactVisibility === "private"
                    ? "Private — hidden from public menus"
                    : "Public"}
                  )
                </p>
              </div>

              {/* Summary Block C & D: Presence, Location & Menu */}
              <div className="rounded-xl border bg-card p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    3. Business Presence & Service Context
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setField("step", 2)}
                      className="font-semibold text-primary hover:underline"
                    >
                      Edit presence
                    </button>
                    <button
                      type="button"
                      onClick={() => setField("step", 3)}
                      className="font-semibold text-primary hover:underline"
                    >
                      Edit location
                    </button>
                  </div>
                </div>
                <p>
                  <b>Customer-facing name:</b> {effectiveVenueName}{" "}
                  {f.deliveryOnly ? "(Delivery-only)" : "(Physical location)"}
                </p>
                <p className="text-muted-foreground">
                  <b>{f.deliveryOnly ? "Delivery coverage:" : "Address:"}</b>{" "}
                  {f.deliveryOnly ? f.serviceArea || f.address : f.address}
                </p>
                <p className="text-muted-foreground">
                  <b>Services:</b>{" "}
                  {f.deliveryOnly ? "Delivery" : f.services.join(", ") || "Dine-in"} ·{" "}
                  <b>Initial menu:</b> {f.menuName}
                </p>
                {(f.servicePointName || f.additionalServiceContexts.length > 0) && (
                  <p className="text-muted-foreground">
                    <b>Service contexts:</b>{" "}
                    {[f.servicePointName, ...f.additionalServiceContexts]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <p className="text-muted-foreground">
                  <b>Public customer contact:</b>{" "}
                  {[
                    f.whatsapp && `WhatsApp: ${f.whatsapp}`,
                    f.phone && `Phone: ${f.phone}`,
                    f.email && `Email: ${f.email}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Nothing is published to customers yet. Creating your organisation sets up your draft
                menu so you can add sections, items, and prices at your own pace.
              </span>
            </div>
          </section>
        )}
      </div>

      {/* Validation feedback */}
      {validationHint && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
        >
          {validationHint}
        </p>
      )}

      {/* Navigation Footer */}
      <div className="mt-6 flex gap-2.5">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 px-5 text-sm font-semibold"
            onClick={() => setField("step", step - 1)}
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          data-testid="onboarding-continue-btn"
          className="h-12 flex-1 text-sm font-semibold"
          disabled={!valid}
          onClick={handleNext}
        >
          {step < 4 ? "Continue" : "Create organisation & first menu"}
        </Button>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  id,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "value"
>) {
  const fieldId =
    id ||
    `field-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}`;
  return (
    <div>
      <Label htmlFor={fieldId} className="mb-1.5 block text-xs font-semibold">
        {label}
      </Label>
      <Input
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-sm"
        {...rest}
      />
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 rounded-xl border bg-card px-3.5 py-2 text-left text-sm font-medium transition-colors",
        active && "border-primary bg-primary/5 text-primary",
      )}
    >
      {children}
      {active && <Check className="h-4 w-4 shrink-0" />}
    </button>
  );
}
