import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  ROLE_LABELS,
  canInviteRole,
  canManageTeam,
  canModifyMember,
  canRevokeMember,
  getActiveOrganisationMembership,
  getEffectiveBusinessRole,
  isBusinessRole,
  usePewa,
} from "@/lib/pewa/store";
import type {
  MembershipRole,
  OrganisationMembership,
  ScopeType,
  TeamInvitation,
} from "@/lib/pewa/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/team")({
  head: () => ({
    meta: [
      { title: "Team Management — PEWA" },
      {
        name: "description",
        content:
          "Manage organisation members, role assignments, operational scopes and invitations.",
      },
    ],
  }),
  component: AdminTeamPage,
});

const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  owner: "Full organisation control, billing, venues, and team administration.",
  admin: "Operational control across all venues and staff management. Cannot alter Owner status.",
  manager: "Operational management for assigned venues and menus; can invite and manage Staff.",
  staff: "Day-to-day operations (orders queue and item availability) for assigned service points.",
};

const COMMON_SERVICE_POINTS = [
  "Main Counter",
  "Barista Station",
  "Dine-in Area",
  "Kitchen Pass",
  "Takeaway Window",
  "Patio Bar",
];

function AdminTeamPage() {
  const {
    role,
    organisation,
    venues,
    personalIdentity,
    identities = [],
    memberships = [],
    invitations = [],
    createInvitation,
    cancelInvitation,
    updateMembershipScope,
    revokeMembership,
  } = usePewa();

  const effectiveRole = getEffectiveBusinessRole({
    role,
    personalIdentity,
    organisation,
    memberships,
  });

  const activeMembership = getActiveOrganisationMembership({
    personalIdentity,
    organisation,
    memberships,
  });

  const orgVenues = useMemo(
    () => venues.filter((v) => v.orgId === organisation?.id),
    [venues, organisation?.id],
  );

  const orgMemberships = useMemo(
    () => (memberships || []).filter((m) => m.orgId === organisation?.id),
    [memberships, organisation?.id],
  );

  const orgInvitations = useMemo(
    () => (invitations || []).filter((i) => i.orgId === organisation?.id),
    [invitations, organisation?.id],
  );

  // Invite Dialog State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [recipientContact, setRecipientContact] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("staff");
  const [inviteScopeType, setInviteScopeType] = useState<ScopeType>("restricted");
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [selectedServicePoints, setSelectedServicePoints] = useState<string[]>([]);
  const [customPointInput, setCustomPointInput] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState<TeamInvitation | null>(null);

  // Edit Scope Dialog State
  const [editScopeTarget, setEditScopeTarget] = useState<OrganisationMembership | null>(null);
  const [editScopeType, setEditScopeType] = useState<ScopeType>("restricted");
  const [editVenues, setEditVenues] = useState<string[]>([]);
  const [editServicePoints, setEditServicePoints] = useState<string[]>([]);
  const [editCustomPoint, setEditCustomPoint] = useState("");
  const [editRole, setEditRole] = useState<MembershipRole>("staff");

  // Revoke Confirmation State
  const [revokeTarget, setRevokeTarget] = useState<OrganisationMembership | null>(null);

  // Allowed roles for caller to invite
  const allowedInviteRoles: MembershipRole[] = useMemo(() => {
    if (effectiveRole === "owner") return ["owner", "admin", "manager", "staff"];
    if (effectiveRole === "admin") return ["admin", "manager", "staff"];
    if (effectiveRole === "manager") return ["staff"];
    return [];
  }, [effectiveRole]);

  // Permitted venues for manager scoping
  const permittedVenuesForCaller = useMemo(() => {
    if (effectiveRole === "owner" || effectiveRole === "admin") return orgVenues;
    if (effectiveRole === "manager" && activeMembership) {
      const assigned =
        activeMembership.venueIds && activeMembership.venueIds.length > 0
          ? activeMembership.venueIds
          : activeMembership.venueId
            ? [activeMembership.venueId]
            : [];
      return orgVenues.filter((v) => assigned.includes(v.id));
    }
    return [];
  }, [effectiveRole, activeMembership, orgVenues]);

  const handleOpenInviteModal = () => {
    setRecipientContact("");
    setRecipientName("");
    const defaultRole: MembershipRole = effectiveRole === "manager" ? "staff" : "manager";
    setInviteRole(defaultRole);
    setInviteScopeType("restricted");
    setSelectedVenues(permittedVenuesForCaller.map((v) => v.id));
    setSelectedServicePoints(["Main Counter"]);
    setCustomPointInput("");
    setGeneratedInvite(null);
    setInviteModalOpen(true);
  };

  const handleCreateInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientContact.trim()) {
      toast.error("Please enter an email or mobile number for the recipient.");
      return;
    }

    const res = createInvitation({
      recipientContact,
      recipientName: recipientName.trim() || undefined,
      role: inviteRole,
      scopeType: inviteScopeType,
      venueIds: inviteScopeType === "all" ? undefined : selectedVenues,
      servicePoints: inviteScopeType === "all" ? undefined : selectedServicePoints,
    });

    if (!res.success || !res.invitation) {
      toast.error(res.error || "Failed to create invitation.");
      return;
    }

    setGeneratedInvite(res.invitation);
    toast.success(`Invitation generated for ${res.invitation.recipientContact}!`);
  };

  const handleCopyLink = (invitationId: string) => {
    const inviteUrl = `${window.location.origin}/invite/${invitationId}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invitation link copied to clipboard!");
  };

  const handleCancelInvite = (invitationId: string) => {
    const res = cancelInvitation(invitationId);
    if (res.success) {
      toast.success("Invitation cancelled.");
    } else {
      toast.error(res.error || "Failed to cancel invitation.");
    }
  };

  const handleOpenEditScope = (m: OrganisationMembership) => {
    setEditScopeTarget(m);
    setEditScopeType(
      m.scopeType || (m.role === "owner" || m.role === "admin" ? "all" : "restricted"),
    );
    setEditVenues(
      m.venueIds && m.venueIds.length > 0
        ? [...m.venueIds]
        : m.venueId
          ? [m.venueId]
          : orgVenues.map((v) => v.id),
    );
    setEditServicePoints(m.servicePoints ? [...m.servicePoints] : ["Main Counter"]);
    setEditRole(m.role);
    setEditCustomPoint("");
  };

  const handleSaveEditScope = () => {
    if (!editScopeTarget) return;
    const res = updateMembershipScope({
      membershipId: editScopeTarget.id,
      scopeType: editScopeType,
      venueIds: editScopeType === "all" ? undefined : editVenues,
      servicePoints: editScopeType === "all" ? undefined : editServicePoints,
      role: editRole,
    });
    if (res.success) {
      toast.success("Team member operational scope updated.");
      setEditScopeTarget(null);
    } else {
      toast.error(res.error || "Failed to update scope.");
    }
  };

  const handleConfirmRevoke = () => {
    if (!revokeTarget) return;
    const res = revokeMembership(revokeTarget.id);
    if (res.success) {
      toast.success("Team membership revoked.");
      setRevokeTarget(null);
    } else {
      toast.error(res.error || "Failed to revoke membership.");
    }
  };

  // Staff guard: Staff cannot access team management
  if (effectiveRole === "staff") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center" data-testid="staff-team-denied">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Staff Operational Access Only</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          As an Operational Staff member, you do not have permission to manage organisation team
          members, issue invitations, or alter role assignments.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/admin/orders">Go to Orders Queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin">Workspace Overview</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Not a business member guard
  if (!isBusinessRole(effectiveRole) || !organisation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">No Active Organisation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You must be signed in with an active business membership to access Team Management.
        </p>
        <Button asChild className="mt-6">
          <Link to="/admin">Return to Workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" data-testid="team-management-page">
      {/* Header & Breadcrumb */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/admin" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-foreground">Team</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team Management</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage member roles, location assignments, and operational station access for{" "}
              <b>{organisation.name}</b>.
            </p>
          </div>

          {canManageTeam(effectiveRole) && (
            <Button
              onClick={handleOpenInviteModal}
              className="h-10 shrink-0 font-semibold shadow-sm"
              data-testid="invite-member-btn"
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Invite team member
            </Button>
          )}
        </div>
      </div>

      {/* Role Authority Context Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
            <Shield className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                Acting as: {ROLE_LABELS[effectiveRole]}
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                {effectiveRole === "owner" || effectiveRole === "admin"
                  ? "Organisation-Wide Scope"
                  : "Scoped Operational Access"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {effectiveRole === "owner" &&
                "As the Organisation Owner, you have complete authority over all team memberships, roles, billing, and venue operations."}
              {effectiveRole === "admin" &&
                "As an Administrator, you can invite and manage Admins, Managers, and Staff across all venues. You cannot revoke or alter the founding Owner."}
              {effectiveRole === "manager" &&
                "As a Manager, you can invite and manage Staff within your assigned venues. Organisation billing and dispute management are restricted."}
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Active Team Members */}
      <section aria-labelledby="team-members-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="team-members-heading" className="text-base font-bold text-foreground">
              Team Members ({orgMemberships.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Individuals with verified personal identities and active organisation membership.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgMemberships.map((membership) => {
            const memberIdentity = identities.find((idItem) => idItem.id === membership.identityId);
            const isCaller = personalIdentity?.id === membership.identityId;
            const canModify = canModifyMember(effectiveRole, membership);
            const revokeCheck = canRevokeMember(
              effectiveRole,
              personalIdentity?.id,
              membership,
              orgMemberships,
            );

            // Scoping resolution
            const isAllScope =
              membership.scopeType === "all" ||
              membership.role === "owner" ||
              membership.role === "admin";
            const memberVenues =
              membership.venueIds && membership.venueIds.length > 0
                ? orgVenues.filter((v) => membership.venueIds?.includes(v.id))
                : membership.venueId
                  ? orgVenues.filter((v) => v.id === membership.venueId)
                  : [];

            return (
              <div
                key={membership.id}
                className={`relative flex flex-col justify-between rounded-xl border bg-card p-4 transition-all shadow-xs ${
                  membership.status === "revoked" ? "opacity-60 bg-muted/40" : ""
                }`}
                data-testid={`member-card-${membership.id}`}
              >
                <div className="space-y-3">
                  {/* Member Name and Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        {memberIdentity?.fullName || "Team Member"}
                        {isCaller && (
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {memberIdentity?.email || memberIdentity?.mobile || "No direct contact"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          membership.role === "owner"
                            ? "default"
                            : membership.role === "admin"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px] font-bold uppercase tracking-wider"
                      >
                        {ROLE_LABELS[membership.role]}
                      </Badge>
                      <Badge
                        variant={membership.status === "active" ? "outline" : "destructive"}
                        className={`text-[9px] ${
                          membership.status === "active"
                            ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                            : ""
                        }`}
                      >
                        {membership.status === "active" ? "Active" : "Revoked"}
                      </Badge>
                    </div>
                  </div>

                  {/* Operational Scope Details */}
                  <div className="rounded-lg border bg-muted/30 p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>Operational Scope:</span>
                    </div>

                    {isAllScope ? (
                      <p className="font-medium text-foreground">
                        Organisation-wide (All venues &amp; stations)
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {memberVenues.length > 0
                            ? memberVenues.map((v) => v.name).join(", ")
                            : "No assigned locations"}
                        </p>
                        {membership.servicePoints && membership.servicePoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {membership.servicePoints.map((pt) => (
                              <span
                                key={pt}
                                className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border"
                              >
                                {pt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    Joined: {new Date(membership.joinedAt).toLocaleDateString()}
                    {membership.revokedAt && (
                      <span className="text-destructive block">
                        Revoked: {new Date(membership.revokedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                {membership.status === "active" && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                    {canModify && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleOpenEditScope(membership)}
                        data-testid={`edit-scope-btn-${membership.id}`}
                      >
                        Edit Scope
                      </Button>
                    )}

                    {revokeCheck.allowed ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setRevokeTarget(membership)}
                        data-testid={`revoke-member-btn-${membership.id}`}
                      >
                        Revoke
                      </Button>
                    ) : (
                      revokeCheck.reason && (
                        <span className="text-[10px] text-muted-foreground italic px-1">
                          {revokeCheck.reason}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Pending & Past Invitations */}
      <section aria-labelledby="invitations-heading" className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="invitations-heading" className="text-base font-bold text-foreground">
              Invitations ({orgInvitations.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Simulated invitations dispatched to prospective team members.
            </p>
          </div>
        </div>

        {orgInvitations.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
            No pending or past invitations found for this organisation.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgInvitations.map((inv) => {
              const isPending = inv.status === "pending";
              const isAccepted = inv.status === "accepted";
              const isCancelled = inv.status === "cancelled";
              const isExpired =
                inv.status === "expired" ||
                (isPending && new Date(inv.expiresAt).getTime() < Date.now());

              return (
                <div
                  key={inv.id}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 text-xs space-y-3 shadow-xs"
                  data-testid={`invitation-card-${inv.id}`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-foreground">
                          {inv.recipientName || inv.recipientContact}
                        </p>
                        <p className="text-xs text-muted-foreground">{inv.recipientContact}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                          {ROLE_LABELS[inv.role]}
                        </Badge>
                        <Badge
                          variant={isAccepted ? "default" : isPending ? "secondary" : "outline"}
                          className={`text-[9px] ${
                            isAccepted
                              ? "bg-emerald-600 text-white"
                              : isPending
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                : "text-muted-foreground"
                          }`}
                        >
                          {isExpired
                            ? "Expired"
                            : isAccepted
                              ? "Accepted"
                              : isCancelled
                                ? "Cancelled"
                                : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-2 space-y-1 text-[11px]">
                      <p className="text-muted-foreground">
                        Scope:{" "}
                        <span className="font-semibold text-foreground">
                          {inv.scopeType === "all"
                            ? "Organisation-wide"
                            : `${inv.venueIds?.length || 0} location(s)`}
                        </span>
                      </p>
                      {inv.servicePoints && inv.servicePoints.length > 0 && (
                        <p className="text-muted-foreground">
                          Stations:{" "}
                          <span className="text-foreground">{inv.servicePoints.join(", ")}</span>
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground pt-1">
                        Invited by {inv.invitedByName} on{" "}
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-t pt-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => handleCopyLink(inv.id)}
                      data-testid={`copy-invite-link-${inv.id}`}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Copy Link
                    </Button>

                    <Button asChild variant="ghost" size="sm" className="h-7 text-[11px]">
                      <Link to="/invite/$inviteId" params={{ inviteId: inv.id }}>
                        <ExternalLink className="mr-1 h-3 w-3" /> View
                      </Link>
                    </Button>

                    {isPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelInvite(inv.id)}
                        data-testid={`cancel-invite-btn-${inv.id}`}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Invite Member Dialog */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-lg" data-testid="invite-team-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generate a role-scoped team invitation for <b>{organisation.name}</b>.
            </DialogDescription>
          </DialogHeader>

          {generatedInvite ? (
            <div className="space-y-4 py-2" data-testid="invite-success-card">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <Check className="h-4 w-4" />
                  Invitation Created Successfully!
                </div>
                <p className="text-muted-foreground">
                  An invitation has been generated for <b>{generatedInvite.recipientContact}</b> as{" "}
                  <b>{ROLE_LABELS[generatedInvite.role]}</b>.
                </p>
                <div className="rounded border bg-background p-2 font-mono text-[11px] break-all select-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/invite/${generatedInvite.id}`
                    : `/invite/${generatedInvite.id}`}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 font-semibold"
                  onClick={() => handleCopyLink(generatedInvite.id)}
                  data-testid="copy-generated-invite-btn"
                >
                  <Copy className="mr-1.5 h-4 w-4" /> Copy Link
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/invite/$inviteId" params={{ inviteId: generatedInvite.id }}>
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Open Acceptance View
                  </Link>
                </Button>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateInviteSubmit} className="space-y-4 py-2">
              {/* Recipient Contact & Name */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="recipientContact" className="text-xs font-semibold">
                    Recipient Email or Mobile <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="recipientContact"
                    placeholder="e.g. amara@greengarden.example or +254 712 345678"
                    value={recipientContact}
                    onChange={(e) => setRecipientContact(e.target.value)}
                    required
                    className="h-9 text-xs"
                    data-testid="invite-contact-input"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    The accepting user must register or verify with this exact identifier (Scenario
                    E fail-closed protection).
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="recipientName" className="text-xs font-semibold">
                    Full Name (Optional)
                  </Label>
                  <Input
                    id="recipientName"
                    placeholder="e.g. Amara Okafor"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="h-9 text-xs"
                    data-testid="invite-name-input"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role &amp; Permissions</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {allowedInviteRoles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setInviteRole(r);
                        if (r === "owner" || r === "admin") {
                          setInviteScopeType("all");
                        }
                      }}
                      className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all ${
                        inviteRole === r
                          ? "border-primary bg-primary/10 font-bold text-primary ring-1 ring-primary"
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      }`}
                      data-testid={`role-option-${r}`}
                    >
                      <span className="text-xs capitalize">{r}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">
                        {r === "staff" ? "Operations" : r === "manager" ? "Venue lead" : "Admin"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  {ROLE_DESCRIPTIONS[inviteRole]}
                </p>
              </div>

              {/* Operational Scope */}
              <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Location &amp; Station Scope</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={inviteRole === "staff" && effectiveRole === "manager"}
                      onClick={() => setInviteScopeType("all")}
                      className={`flex-1 rounded-md border py-1.5 text-xs font-medium ${
                        inviteScopeType === "all"
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      All Locations
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteScopeType("restricted")}
                      className={`flex-1 rounded-md border py-1.5 text-xs font-medium ${
                        inviteScopeType === "restricted"
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      Restricted Locations
                    </button>
                  </div>
                </div>

                {inviteScopeType === "restricted" && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Assigned Locations
                      </Label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {permittedVenuesForCaller.map((v) => {
                          const checked = selectedVenues.includes(v.id);
                          return (
                            <label
                              key={v.id}
                              className="flex items-center gap-2 rounded border bg-card px-2.5 py-1.5 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVenues([...selectedVenues, v.id]);
                                  } else {
                                    setSelectedVenues(selectedVenues.filter((id) => id !== v.id));
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded text-primary"
                              />
                              <span className="font-medium text-foreground">{v.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Operational Service Points / Stations
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_SERVICE_POINTS.map((pt) => {
                          const active = selectedServicePoints.includes(pt);
                          return (
                            <button
                              key={pt}
                              type="button"
                              onClick={() => {
                                if (active) {
                                  setSelectedServicePoints(
                                    selectedServicePoints.filter((p) => p !== pt),
                                  );
                                } else {
                                  setSelectedServicePoints([...selectedServicePoints, pt]);
                                }
                              }}
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-all ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {pt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom point entry */}
                      <div className="flex gap-1.5 pt-1">
                        <Input
                          placeholder="Add custom station (e.g. Pastry Counter)"
                          value={customPointInput}
                          onChange={(e) => setCustomPointInput(e.target.value)}
                          className="h-7 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (
                              customPointInput.trim() &&
                              !selectedServicePoints.includes(customPointInput.trim())
                            ) {
                              setSelectedServicePoints([
                                ...selectedServicePoints,
                                customPointInput.trim(),
                              ]);
                              setCustomPointInput("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Prototype notice */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-amber-900 dark:text-amber-200">
                <b>Simulation Notice:</b> Invitations are generated client-side for deterministic
                testing. You will receive an immediate acceptance link to test this journey.
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="submit-invite-btn">
                  Generate Invitation
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Scope Dialog */}
      <Dialog open={!!editScopeTarget} onOpenChange={(open) => !open && setEditScopeTarget(null)}>
        <DialogContent className="max-w-md" data-testid="edit-scope-dialog">
          <DialogHeader>
            <DialogTitle>Edit Operational Scope</DialogTitle>
            <DialogDescription className="text-xs">
              Update location assignments and stations for this member.
            </DialogDescription>
          </DialogHeader>

          {editScopeTarget && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Scope Type</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditScopeType("all")}
                    className={`flex-1 rounded-md border py-1.5 text-xs font-medium ${
                      editScopeType === "all"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    All Locations
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditScopeType("restricted")}
                    className={`flex-1 rounded-md border py-1.5 text-xs font-medium ${
                      editScopeType === "restricted"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    Restricted
                  </button>
                </div>
              </div>

              {editScopeType === "restricted" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assigned Locations</Label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {orgVenues.map((v) => {
                        const checked = editVenues.includes(v.id);
                        return (
                          <label
                            key={v.id}
                            className="flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditVenues([...editVenues, v.id]);
                                } else {
                                  setEditVenues(editVenues.filter((id) => id !== v.id));
                                }
                              }}
                              className="h-3.5 w-3.5 rounded text-primary"
                            />
                            <span className="font-medium text-foreground">{v.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Stations</Label>
                    <div className="flex flex-wrap gap-1">
                      {COMMON_SERVICE_POINTS.map((pt) => {
                        const active = editServicePoints.includes(pt);
                        return (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => {
                              if (active) {
                                setEditServicePoints(editServicePoints.filter((p) => p !== pt));
                              } else {
                                setEditServicePoints([...editServicePoints, pt]);
                              }
                            }}
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                              active
                                ? "border-primary bg-primary text-primary-foreground font-semibold"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {pt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditScopeTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditScope} data-testid="save-scope-btn">
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="max-w-md" data-testid="revoke-confirm-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Revoke Team Member Access
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to revoke membership for this user?
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border bg-destructive/5 p-3 space-y-1">
                <p className="font-bold text-destructive">
                  Immediate Operational Revocation (Scenario J)
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  The user will immediately lose all business workspace access and operational
                  permissions in <b>{organisation.name}</b>. Their effective role will drop to
                  customer.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRevokeTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmRevoke}
                  data-testid="confirm-revoke-btn"
                >
                  Revoke Access
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
