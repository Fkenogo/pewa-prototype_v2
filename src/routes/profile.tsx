import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { pageHead } from "@/lib/pewa/metadata";
import {
  getActiveOrganisationMembership,
  hasActiveBusinessMembership,
  usePewa,
} from "@/lib/pewa/store";
import { getAuthoritativeVenues } from "@/lib/pewa/ordering";
import {
  clearDeferredInstallPrompt,
  subscribeInstallPrompt,
  type DeferredInstallPrompt,
} from "@/lib/pewa/install-prompt";
import { CustomerNav } from "@/components/pewa/CustomerNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/profile")({
  head: () =>
    pageHead("Customer profile", "Manage optional customer details and local PEWA activity."),
  component: Profile,
});

function Profile() {
  const state = usePewa();
  const navigate = useNavigate();
  const context = state.customerContext;
  const identified = context.kind === "identified";
  const identityId = context.kind === "identified" ? context.identityId : "";
  const identity = state.identities?.find((item) => item.id === identityId);
  const [name, setName] = useState(identity?.fullName || "");
  const [email, setEmail] = useState(identity?.email || "");
  const [mobile, setMobile] = useState(identity?.mobile || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installGuidance, setInstallGuidance] = useState(
    "This browser has not offered an install option.",
  );
  const venues = getAuthoritativeVenues(state);
  const favouriteNames = state.favourites
    .map((id) => venues.find((venue) => venue.id === id)?.name)
    .filter(Boolean);
  const recentNames = state.recents
    .map((id) => venues.find((venue) => venue.id === id)?.name)
    .filter(Boolean);
  const visibleOrders = state.orders.filter((order) =>
    identified ? order.customerIdentityId === identityId : !order.customerIdentityId,
  );
  const hasBusinessWorkspace =
    !!getActiveOrganisationMembership(state) && hasActiveBusinessMembership(state);

  useEffect(() => {
    setName(identity?.fullName || "");
    setEmail(identity?.email || "");
    setMobile(identity?.mobile || "");
  }, [identity?.id, identity?.fullName, identity?.email, identity?.mobile]);
  useEffect(() => {
    setDismissed(localStorage.getItem("pewa-pwa-invitation-dismissed") === "1");
    const agent = navigator.userAgent;
    setInstallGuidance(
      /iPhone|iPad|iPod/.test(agent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
        ? "On iPhone or iPad, use Share → Add to Home Screen when available."
        : /Android/.test(agent)
          ? "Use your browser menu and choose Add to Home Screen if it is available."
          : "This browser has not offered an install option.",
    );
    return subscribeInstallPrompt(setInstallPrompt);
  }, []);

  const submitProfile = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaved("");
    if (identified) {
      if (!state.updateCustomerProfile({ fullName: name, email, mobile })) {
        setError("Check your name and add a valid email or mobile number.");
        return;
      }
    } else {
      const result = state.createCustomerProfile({ fullName: name, email, mobile });
      if (!result.ok) {
        setError(result.error || "Check your details and try again.");
        return;
      }
    }
    setSaved("Saved on this device. Contact verification is simulated and was not performed.");
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-12">
      <Link to="/" className="font-display text-xl text-primary">
        pewa
      </Link>
      <h1 className="mt-5 text-3xl font-semibold">Profile</h1>
      <section className="mt-5 rounded-xl border bg-card p-4" aria-label="Customer identity status">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Customer mode · {identified ? "Identified" : "Guest"}
        </p>
        {identified && identity ? (
          <>
            <h2 className="mt-2 text-xl font-semibold">{identity.fullName}</h2>
            <p className="text-sm text-muted-foreground">{identity.email || identity.mobile}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Simulated profile only · no password or contact verification. Details are saved
              locally in this prototype.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-xl font-semibold">Browsing as a guest</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You can browse menus and use permitted ordering without an account.
            </p>
          </>
        )}
      </section>

      {!identified && state.personalIdentity && (
        <section className="mt-4 rounded-xl border p-4">
          <h2 className="font-semibold">Already have a PEWA identity?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the existing identity for customer continuity. Your business memberships and
            permissions stay separate.
          </p>
          <Button
            className="mt-3 min-h-11 w-full"
            onClick={() => {
              if (state.continueAsExistingCustomer())
                setSaved("Customer mode is active for your existing PEWA identity.");
            }}
          >
            Continue with {state.personalIdentity.fullName}
          </Button>
        </section>
      )}
      {state.customerIdentityIds.length > 0 && (
        <section className="mt-4 rounded-xl border p-4" aria-label="Local customer profiles">
          <h2 className="font-semibold">Switch customer profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These simulated profiles are saved locally. Selecting one does not verify your
            real-world identity.
          </p>
          <div className="mt-3 space-y-2">
            {state.customerIdentityIds.map((customerId) => {
              const customer = state.identities?.find((item) => item.id === customerId);
              if (!customer) return null;
              const active = identified && identityId === customer.id;
              return (
                <div
                  key={customer.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{customer.fullName}</span>
                  {active ? (
                    <span className="text-xs text-muted-foreground">Current profile</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => state.selectCustomerProfile(customer.id)}
                    >
                      Use profile
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(!identified || identity) && (
        <form className="mt-5 space-y-3 rounded-xl border p-4" onSubmit={submitProfile}>
          <h2 className="font-semibold">
            {identified ? "Edit customer details" : "Optional customer profile"}
          </h2>
          <p className="text-sm text-muted-foreground">
            No password or real verification. PEWA will not match you to someone else by contact
            details.
          </p>
          <label className="block space-y-1 text-sm">
            Full name
            <Input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            Email address (optional)
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            Mobile number (optional)
            <Input
              type="tel"
              autoComplete="tel"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-primary">
              {saved}
            </p>
          )}
          <Button className="min-h-11 w-full" type="submit">
            {identified ? "Save profile" : "Create optional profile"}
          </Button>
        </form>
      )}

      <section className="mt-5 space-y-3" aria-label="Local customer activity">
        <h2 className="text-lg font-semibold">Your activity on this device</h2>
        <p className="text-xs text-muted-foreground">
          Favorites and recent menus stay local to this browser. They are not synced between
          devices.
        </p>
        <Link to="/" search={{ filter: "saved" }} className="block rounded-lg border p-4">
          Favorites <span className="text-muted-foreground">· {favouriteNames.length}</span>
        </Link>
        <Link to="/" search={{ filter: "recents" }} className="block rounded-lg border p-4">
          Recent menus <span className="text-muted-foreground">· {recentNames.length}</span>
        </Link>
        <Link to="/orders" className="block rounded-lg border p-4">
          Order requests <span className="text-muted-foreground">· {visibleOrders.length}</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          Order history is locally stored. Identified requests are shown only for this active
          identity; guest requests remain in guest mode.
        </p>
      </section>

      {hasBusinessWorkspace && (
        <section className="mt-5 rounded-xl border p-4">
          <h2 className="font-semibold">Business workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your active organisation membership controls business access.
          </p>
          <Link
            to="/admin"
            className="mt-3 inline-flex min-h-11 items-center text-primary underline"
          >
            Open Business Workspace
          </Link>
        </section>
      )}
      <Button
        variant="outline"
        className="mt-5 min-h-11 w-full"
        onClick={() => {
          if (identified) state.continueAsGuest();
          void navigate({ to: "/" });
        }}
      >
        {" "}
        {identified ? "Return to guest mode" : "Continue browsing as a guest"}
      </Button>

      {!dismissed && (
        <aside
          className="mt-5 rounded-xl border bg-muted/30 p-4"
          aria-label="Optional installation invitation"
        >
          <h2 className="font-semibold">Keep PEWA handy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add PEWA to your home screen for quicker access. Installation is optional; offline
            access is not provided.
          </p>
          {installPrompt ? (
            <Button
              className="mt-3 min-h-11 w-full"
              onClick={async () => {
                const prompt = installPrompt;
                await prompt.prompt();
                await prompt.userChoice;
                clearDeferredInstallPrompt();
                setInstallPrompt(null);
              }}
            >
              Add to home screen
            </Button>
          ) : (
            <p className="mt-3 text-sm">{installGuidance}</p>
          )}
          <button
            className="mt-3 min-h-11 w-full text-sm text-muted-foreground underline"
            onClick={() => {
              localStorage.setItem("pewa-pwa-invitation-dismissed", "1");
              setDismissed(true);
            }}
          >
            Dismiss
          </button>
        </aside>
      )}
      <CustomerNav />
    </main>
  );
}
