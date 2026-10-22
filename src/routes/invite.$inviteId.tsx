import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  LogIn,
  MapPin,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS, usePewa } from "@/lib/pewa/store";
import type { MembershipRole, PreferredSignInIdentifier } from "@/lib/pewa/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/invite/$inviteId")({
  head: () => ({
    meta: [
      { title: "Team Invitation — PEWA" },
      {
        name: "description",
        content: "Accept your invitation to join a business team on PEWA.",
      },
    ],
  }),
  component: InviteAcceptancePage,
});

const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  owner: "Full ownership of business operations, organisation settings, billing, and team members.",
  admin:
    "Operational control across all business locations, team management, and menu administration.",
  manager: "Operational lead for assigned locations and menus; can manage orders and staff.",
  staff:
    "Operational access for order fulfillment and real-time item availability at assigned stations.",
};

function InviteAcceptancePage() {
  const { inviteId } = useParams({ from: "/invite/$inviteId" });
  const navigate = useNavigate();

  const {
    invitations = [],
    personalIdentity,
    venues = [],
    acceptInvitation,
    declineInvitation,
  } = usePewa();

  // Find invitation by ID or Token
  const invitation = useMemo(() => {
    return invitations.find((i) => i.id === inviteId || i.token === inviteId);
  }, [invitations, inviteId]);

  // Form state for registering or switching identity
  const [fullNameInput, setFullNameInput] = useState(
    personalIdentity?.fullName || invitation?.recipientName || "",
  );
  const [preferredSignIn, setPreferredSignIn] = useState<PreferredSignInIdentifier>(
    invitation?.recipientContact.includes("@") ? "email" : "mobile",
  );
  const [isAcceptedSuccess, setIsAcceptedSuccess] = useState(false);

  // Identity match check (Scenario E)
  const recipientClean = (invitation?.recipientContact || "").trim().toLowerCase();
  const identityEmail = (personalIdentity?.email || "").trim().toLowerCase();
  const identityMobile = (personalIdentity?.mobile || "").trim();

  const isIdentityMatching = Boolean(
    personalIdentity &&
    ((identityEmail && identityEmail === recipientClean) ||
      (identityMobile && identityMobile === recipientClean)),
  );

  const hasMismatchedIdentity = Boolean(personalIdentity && !isIdentityMatching);

  // Target venues display
  const assignedVenues = useMemo(() => {
    if (!invitation?.venueIds || invitation.venueIds.length === 0) return [];
    return venues.filter((v) => invitation.venueIds?.includes(v.id));
  }, [venues, invitation?.venueIds]);

  // Status checks (Scenario F)
  const isAccepted = invitation?.status === "accepted";
  const isCancelled = invitation?.status === "cancelled";
  const isExpired =
    invitation?.status === "expired" ||
    (invitation?.status === "pending" && new Date(invitation.expiresAt).getTime() < Date.now());

  const handleAccept = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invitation) return;

    let res;
    if (isIdentityMatching) {
      // Current identity matches, accept directly
      res = acceptInvitation(invitation.id);
    } else {
      // Provide/upsert identity matching the invitation contact
      const isEmail = invitation.recipientContact.includes("@");
      res = acceptInvitation(invitation.id, {
        fullName: fullNameInput.trim() || invitation.recipientName || "Team Member",
        email: isEmail ? invitation.recipientContact : undefined,
        mobile: !isEmail ? invitation.recipientContact : undefined,
        preferredSignIn,
      });
    }

    if (res.success) {
      toast.success(`Welcome to ${invitation.orgName}!`);
      setIsAcceptedSuccess(true);
    } else {
      toast.error(res.error || "Failed to accept invitation.");
    }
  };

  const handleDecline = () => {
    if (!invitation) return;
    const res = declineInvitation(invitation.id);
    if (res.success) {
      toast.success("Invitation declined.");
    } else {
      toast.error(res.error || "Failed to decline invitation.");
    }
  };

  // 1. Not Found View
  if (!invitation) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center" data-testid="invite-not-found">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Invitation Not Found</h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          The invitation link you followed does not match any valid or active records in this
          prototype session. Please verify the link or ask your business manager to re-issue the
          invite.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">Go to PEWA Home</Link>
          </Button>
          <Button asChild>
            <Link to="/admin">Business Workspace</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 2. Success Confirmation View
  if (isAcceptedSuccess) {
    return (
      <div
        className="mx-auto max-w-md px-4 py-12 text-center"
        data-testid="invite-accepted-success"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <Badge className="mt-4 bg-emerald-600 text-white hover:bg-emerald-600">
          Invitation Accepted
        </Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Welcome to {invitation.orgName}!</h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          You have joined as an active <b>{ROLE_LABELS[invitation.role]}</b>. Your personal identity
          is now authenticated with operational access to assigned locations.
        </p>

        <div className="mt-6 rounded-xl border bg-card p-4 text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Your Role:</span>
            <span className="font-bold text-foreground capitalize">{invitation.role}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Operational Scope:</span>
            <span className="font-semibold text-foreground">
              {invitation.scopeType === "all"
                ? "Organisation-wide"
                : `${assignedVenues.length} location(s)`}
            </span>
          </div>
          {invitation.servicePoints && invitation.servicePoints.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stations:</span>
              <span className="text-foreground">{invitation.servicePoints.join(", ")}</span>
            </div>
          )}
        </div>

        <Button
          className="mt-6 w-full h-11 font-semibold"
          onClick={() => navigate({ to: "/admin" })}
          data-testid="enter-workspace-btn"
        >
          Enter Business Workspace <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // 3. Status View for Inactive/Redeemed/Cancelled/Expired invitations (Scenario F)
  if (isAccepted || isCancelled || isExpired) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center" data-testid="invite-inactive-status">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            isAccepted
              ? "bg-emerald-500/10 text-emerald-600"
              : isCancelled
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {isAccepted ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : isCancelled ? (
            <XCircle className="h-7 w-7" />
          ) : (
            <Clock className="h-7 w-7" />
          )}
        </div>

        <Badge
          variant="outline"
          className={`mt-4 text-xs font-bold uppercase ${
            isAccepted
              ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
              : isCancelled
                ? "border-destructive text-destructive bg-destructive/10"
                : "border-amber-500 text-amber-600 bg-amber-500/10"
          }`}
        >
          {isAccepted
            ? "Invitation Already Accepted"
            : isCancelled
              ? "Invitation Cancelled"
              : "Invitation Expired"}
        </Badge>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">{invitation.orgName}</h1>

        <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {isAccepted &&
            `This single-use invitation was already redeemed on ${
              invitation.acceptedAt
                ? new Date(invitation.acceptedAt).toLocaleDateString()
                : "earlier"
            }. Invitations cannot be reused.`}
          {isCancelled &&
            "This invitation was cancelled by the organisation administrator and is no longer valid."}
          {isExpired &&
            "This invitation link has expired. Please request a new invitation from your business administrator."}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button asChild>
            <Link to="/admin">Go to Business Workspace</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 4. Pending Invitation Acceptance Journey
  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6" data-testid="invite-acceptance-journey">
      {/* Header Context */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">
          Team Invitation
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Join {invitation.orgName}</h1>
        <p className="text-xs text-muted-foreground">
          Invited by <b>{invitation.invitedByName}</b> on{" "}
          {new Date(invitation.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Role & Scope Cards */}
      <div className="rounded-2xl border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-2 border-b pb-3">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Offered Role
            </span>
            <p className="text-lg font-bold text-foreground capitalize flex items-center gap-2">
              {ROLE_LABELS[invitation.role]}
              <Badge variant="outline" className="text-[10px]">
                {invitation.role}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ROLE_DESCRIPTIONS[invitation.role]}
            </p>
          </div>
        </div>

        {/* Operational Scope */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Assigned Operational Scope:</span>
          </div>

          {invitation.scopeType === "all" ? (
            <p className="text-muted-foreground pl-5">
              Organisation-wide access across all locations and stations.
            </p>
          ) : (
            <div className="pl-5 space-y-1">
              <p className="font-medium text-foreground">
                {assignedVenues.length > 0
                  ? assignedVenues.map((v) => v.name).join(", ")
                  : "Assigned locations"}
              </p>
              {invitation.servicePoints && invitation.servicePoints.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {invitation.servicePoints.map((pt) => (
                    <span
                      key={pt}
                      className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
                    >
                      {pt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Identity Verification Section (Scenario E) */}
      <div
        className="rounded-2xl border bg-card p-4 space-y-4 shadow-xs"
        data-testid="identity-verification-card"
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <UserCheck className="h-4 w-4 text-primary" />
          <span>Identity Verification</span>
        </div>

        {isIdentityMatching ? (
          /* Scenario E: Matching Identity Verified */
          <div className="space-y-3" data-testid="identity-match-banner">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Verified Identity Match
              </div>
              <p className="text-muted-foreground">
                You are currently signed in as <b>{personalIdentity?.fullName}</b> (
                {personalIdentity?.email || personalIdentity?.mobile}). This matches the
                invitation's designated recipient.
              </p>
            </div>

            <Button
              className="w-full h-11 font-semibold"
              onClick={() => handleAccept()}
              data-testid="accept-matching-invite-btn"
            >
              Accept Invitation &amp; Join Team
            </Button>
          </div>
        ) : hasMismatchedIdentity ? (
          /* Scenario E: Mismatched Identity Guard */
          <div className="space-y-3.5" data-testid="identity-mismatch-banner">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Recipient Identity Mismatch
              </div>
              <p className="leading-relaxed">
                You are currently signed in as <b>{personalIdentity?.fullName}</b> (
                {personalIdentity?.email || personalIdentity?.mobile}). However, this invitation was
                issued specifically to:
              </p>
              <div className="rounded bg-background/80 p-2 font-mono text-[11px] font-bold text-foreground border">
                {invitation.recipientContact}
              </div>
              <p className="text-[11px] text-muted-foreground pt-0.5">
                To prevent accidental or unauthorised acceptance, you must verify ownership of{" "}
                <b>{invitation.recipientContact}</b> before accepting.
              </p>
            </div>

            {/* Inline registration/switch form */}
            <form onSubmit={handleAccept} className="space-y-3 border-t pt-3">
              <p className="text-xs font-semibold text-foreground">
                Switch or verify as {invitation.recipientContact}:
              </p>

              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-xs">
                  Your Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder="e.g. Brian Kiprop"
                  required
                  className="h-9 text-xs"
                  data-testid="switch-identity-name-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-semibold"
                data-testid="verify-and-accept-btn"
              >
                Verify &amp; Accept as {invitation.recipientContact}
              </Button>
            </form>
          </div>
        ) : (
          /* No active personal identity */
          <form onSubmit={handleAccept} className="space-y-3.5" data-testid="new-identity-form">
            <p className="text-xs text-muted-foreground">
              Please enter your name to register your personal identity and accept this invitation
              as <b>{invitation.recipientContact}</b>:
            </p>

            <div className="space-y-1">
              <Label htmlFor="newFullName" className="text-xs">
                Full Name
              </Label>
              <Input
                id="newFullName"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="e.g. Brian Kiprop"
                required
                className="h-9 text-xs"
                data-testid="new-identity-name-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              data-testid="register-and-accept-btn"
            >
              Confirm Identity &amp; Join Team
            </Button>
          </form>
        )}

        {/* Decline option */}
        <div className="pt-2 text-center border-t">
          <button
            type="button"
            onClick={handleDecline}
            className="text-xs text-muted-foreground hover:text-destructive underline"
            data-testid="decline-invite-btn"
          >
            Decline this invitation
          </button>
        </div>
      </div>
    </div>
  );
}
