import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { usePewa } from "@/lib/pewa/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — PEWA" },
      {
        name: "description",
        content: "Create your business and first menu on PEWA in four short steps.",
      },
      { property: "og:title", content: "Set up your business — PEWA" },
      {
        property: "og:description",
        content: "Create your business and first menu in four short steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

import { SUGGESTED_BUSINESS_CATEGORIES } from "@/lib/pewa/taxonomy";

const SERVICES = ["Dine-in", "Takeaway", "Delivery"];
const CURRENCIES = ["KES", "UGX", "TZS", "USD", "EUR", "GBP"];

function Onboarding() {
  const navigate = useNavigate();
  const complete = usePewa((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [f, setF] = useState({
    orgName: "",
    businessType: "Café",
    category: "Café",
    venueName: "",
    address: "",
    currency: "KES",
    services: ["Dine-in", "Takeaway"],
    phone: "",
    whatsapp: "",
    email: "",
    menuName: "All-Day Menu",
  });
  const deliveryOnly =
    f.businessType.toLowerCase().includes("delivery") ||
    f.category.toLowerCase().includes("delivery");
  const set = (k: keyof typeof f, v: string | string[]) => setF((p) => ({ ...p, [k]: v }));

  const effectiveCategory = isCustomCategory ? customCategoryInput.trim() : f.category;

  const valid = [
    f.orgName.trim().length > 1 && effectiveCategory.length > 1,
    f.venueName.trim().length > 1 && (deliveryOnly || f.address.trim().length > 1),
    f.services.length > 0 && (f.phone || f.whatsapp || f.email),
    f.menuName.trim().length > 1,
  ][step];

  const steps = ["Business", "Venue", "Service & contact", "First menu"];

  const next = () => {
    if (step < 3) return setStep(step + 1);
    const menuId = complete({
      ...f,
      category: effectiveCategory,
      businessType: effectiveCategory,
      deliveryOnly,
      services: deliveryOnly ? ["Delivery"] : f.services,
    });
    navigate({ to: "/admin/menus/$menuId", params: { menuId } });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pt-5 pb-safe">
      <div className="mb-6 flex items-center gap-2 pr-28">
        <button
          onClick={() => (step ? setStep(step - 1) : navigate({ to: "/" }))}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">
          Step {step + 1} of 4 · {steps[step]}
        </span>
      </div>
      <div className="mb-8 flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>

      <div className="flex-1 space-y-5">
        {step === 0 && (
          <>
            <h1 className="text-3xl">What's your business called?</h1>
            <Field
              label="Business name"
              value={f.orgName}
              onChange={(v) => set("orgName", v)}
              placeholder="e.g. Mama Njeri's Kitchen"
              autoFocus
            />
            <div>
              <Label className="mb-2 block">What kind of business?</Label>
              <div className="grid gap-2">
                {SUGGESTED_BUSINESS_CATEGORIES.map((c) => (
                  <Choice
                    key={c.id}
                    active={!isCustomCategory && f.category === c.label}
                    onClick={() => {
                      setIsCustomCategory(false);
                      set("category", c.label);
                      set("businessType", c.label);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium">{c.label}</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        {c.description}
                      </div>
                    </div>
                  </Choice>
                ))}
                <Choice active={isCustomCategory} onClick={() => setIsCustomCategory(true)}>
                  <div className="text-left">
                    <div className="font-medium">Custom category...</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Type your own category in any language (e.g. Swahili Street Food, Pastry Bar)
                    </div>
                  </div>
                </Choice>
              </div>

              {isCustomCategory && (
                <div className="mt-3">
                  <Label className="mb-1.5 block text-xs">Enter your custom category</Label>
                  <Input
                    autoFocus
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="e.g. Swahili Coastal Dining"
                    className="h-11"
                  />
                </div>
              )}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-3xl">
              {deliveryOnly ? "Where do you deliver?" : "Where can customers find you?"}
            </h1>
            <Field
              label="Name customers see"
              value={f.venueName || f.orgName}
              onChange={(v) => set("venueName", v)}
            />
            <Field
              label={deliveryOnly ? "Service area" : "Street address"}
              value={f.address}
              onChange={(v) => set("address", v)}
              placeholder={
                deliveryOnly ? "e.g. Westlands & Kilimani" : "e.g. 14 Moi Avenue, Nairobi"
              }
            />
            {deliveryOnly && (
              <p className="text-sm text-muted-foreground">
                No street address needed — we'll only show your service area.
              </p>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-3xl">How do you serve, and how can customers reach you?</h1>
            {!deliveryOnly && (
              <div>
                <Label className="mb-2 block">Service</Label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map((s) => (
                    <Choice
                      key={s}
                      active={f.services.includes(s)}
                      onClick={() =>
                        set(
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
            )}
            <div>
              <Label className="mb-2 block">Currency</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map((c) => (
                  <Choice key={c} active={f.currency === c} onClick={() => set("currency", c)}>
                    {c}
                  </Choice>
                ))}
              </div>
            </div>
            <Field
              label="WhatsApp number"
              value={f.whatsapp}
              onChange={(v) => set("whatsapp", v)}
              placeholder="+254 7…"
              type="tel"
            />
            <Field
              label="Phone number"
              value={f.phone}
              onChange={(v) => set("phone", v)}
              placeholder="+254 7…"
              type="tel"
            />
            <Field
              label="Email (optional)"
              value={f.email}
              onChange={(v) => set("email", v)}
              type="email"
            />
            <p className="text-xs text-muted-foreground">Add at least one way to reach you.</p>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-3xl">Name your first menu</h1>
            <Field label="Menu name" value={f.menuName} onChange={(v) => set("menuName", v)} />
            <div className="flex flex-wrap gap-2">
              {["All-Day Menu", "Breakfast", "Drinks", "Lunch"].map((t) => (
                <Choice key={t} active={f.menuName === t} onClick={() => set("menuName", t)}>
                  {t}
                </Choice>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              You'll add sections and items next. Nothing goes live until you tap Publish.
            </p>
          </>
        )}
      </div>

      <Button
        size="lg"
        className="mt-8 h-14 w-full text-base"
        disabled={!valid}
        onClick={() => {
          if (step === 1 && !f.venueName) set("venueName", f.orgName);
          next();
        }}
        onMouseDown={() => step === 0 && !f.venueName && set("venueName", f.orgName)}
      >
        {step < 3 ? "Continue" : "Create menu"}
      </Button>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "value"
>) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 text-base"
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
        "flex min-h-11 items-center justify-between gap-2 rounded-xl border bg-card px-4 text-left text-sm font-medium",
        active && "border-primary bg-primary/5 text-primary",
      )}
    >
      {children}
      {active && <Check className="h-4 w-4" />}
    </button>
  );
}
