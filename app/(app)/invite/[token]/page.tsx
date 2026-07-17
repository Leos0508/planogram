import InviteAcceptClient from "@/components/invite-accept-client";
import { getInvitePreview } from "@/lib/members/actions";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getInvitePreview(token);

  if (!preview.ok) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-2 border border-border bg-card p-6">
          <h1 className="text-base font-semibold">Invite unavailable</h1>
          <p className="text-sm text-muted-foreground">{preview.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <InviteAcceptClient
        token={token}
        workspaceId={preview.data.workspaceId}
        workspaceName={preview.data.workspaceName}
        expired={preview.data.expired}
        alreadyMember={preview.data.alreadyMember}
        isJoinedActive={preview.data.isJoinedActive}
      />
    </main>
  );
}
