"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceAccess, WorkspaceRole } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";
import {
  createInviteLink,
  removeMember,
  revokeInviteLink,
  sendInviteEmail,
  updateMemberAccess,
  type MemberListItem,
} from "@/lib/members/actions";

type InviteView = {
  id: string;
  token: string;
  expiresAtLabel: string;
};

function inviteUrl(token: string) {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

export default function MembersSettingsClient({
  members: initialMembers,
  activeInvite: initialInvite,
  canManage,
}: {
  members: MemberListItem[];
  activeInvite: InviteView | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [members, setMembers] = useState(initialMembers);
  const [invite, setInvite] = useState(initialInvite);
  const [inviteEmail, setInviteEmail] = useState("");

  const onSendInviteEmail = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await sendInviteEmail({ email: inviteEmail });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setInvite({
        id: result.data.invite.id,
        token: result.data.invite.token,
        expiresAtLabel: new Date(
          result.data.invite.expiresAt,
        ).toLocaleString(),
      });
      toast.success(`Invite sent to ${result.data.emailedTo}`);
      setInviteEmail("");
      router.refresh();
    });
  };

  const onCreateInvite = () => {
    startTransition(async () => {
      const result = await createInviteLink();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setInvite({
        id: result.data.id,
        token: result.data.token,
        expiresAtLabel: new Date(result.data.expiresAt).toLocaleString(),
      });
      const url = inviteUrl(result.data.token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Invite link created and copied");
      } catch {
        toast.success("Invite link created");
      }
      router.refresh();
    });
  };

  const onCopyInvite = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(invite.token));
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const onRevokeInvite = () => {
    if (!invite) return;
    startTransition(async () => {
      const result = await revokeInviteLink({ inviteId: invite.id });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setInvite(null);
      toast.success("Invite link revoked");
      router.refresh();
    });
  };

  const onAccessChange = (memberId: string, access: WorkspaceAccess) => {
    startTransition(async () => {
      const result = await updateMemberAccess({ memberId, access });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setMembers((current) =>
        current.map((member) =>
          member.id === memberId ? result.data : member,
        ),
      );
      toast.success("Member access updated");
      router.refresh();
    });
  };

  const onRemove = (member: MemberListItem) => {
    startTransition(async () => {
      const result = await removeMember({ memberId: member.id });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setMembers((current) =>
        current.filter((item) => item.id !== member.id),
      );
      toast.success(`Removed ${member.name || member.email}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {canManage ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">Invite by email</h2>
            <p className="text-sm text-muted-foreground">
              Send an accept link to a teammate. They must sign in, then open the
              link.
            </p>
          </div>
          <form
            onSubmit={onSendInviteEmail}
            className="flex max-w-xl flex-col gap-3 border p-4 sm:flex-row sm:items-end"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                disabled={pending}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={pending || !inviteEmail.trim()}>
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </form>
        </section>
      ) : null}

      {canManage ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">Invite link</h2>
            <p className="text-sm text-muted-foreground">
              Anyone with the link can join as a member with full edit access.
            </p>
          </div>
          {invite ? (
            <div className="flex max-w-xl flex-col gap-2 border p-4">
              <code className="break-all text-xs text-muted-foreground">
                {inviteUrl(invite.token)}
              </code>
              <p className="text-xs text-muted-foreground">
                Expires {invite.expiresAtLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={onCopyInvite}
                >
                  Copy link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={onRevokeInvite}
                >
                  Revoke
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={onCreateInvite}
                >
                  New link
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={onCreateInvite}
            >
              Create invite link
            </Button>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">People</h2>
          <p className="text-sm text-muted-foreground">
            Role and access for everyone in this workspace.
          </p>
        </div>
        <ul className="divide-y border">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.name?.trim() || member.email}
                  {member.isSelf ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {member.role === WorkspaceRole.OWNER ? "Owner" : "Member"}
                </span>
                {canManage && member.role === WorkspaceRole.MEMBER ? (
                  <>
                    <select
                      className="h-8 border border-border bg-background px-2 text-sm"
                      value={member.access}
                      disabled={pending}
                      aria-label={`Access for ${member.email}`}
                      onChange={(event) =>
                        onAccessChange(
                          member.id,
                          event.target.value as WorkspaceAccess,
                        )
                      }
                    >
                      <option value={WorkspaceAccess.FULL}>Full edit</option>
                      <option value={WorkspaceAccess.READ}>Read only</option>
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => onRemove(member)}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {member.role === WorkspaceRole.OWNER ||
                    member.access === WorkspaceAccess.FULL
                      ? "Full edit"
                      : "Read only"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
