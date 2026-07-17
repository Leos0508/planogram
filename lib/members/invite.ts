/**
 * After invite accept: keep previous active workspace; optionally switch.
 * (PLA-48 locked UX — do not auto-switch on accept.)
 */
export function shouldOfferSwitchToJoined(input: {
  joinedWorkspaceId: string;
  activeWorkspaceId: string;
}): boolean {
  return input.joinedWorkspaceId !== input.activeWorkspaceId;
}

export function inviteJoinedStayMessage(workspaceName: string): string {
  return `Joined ${workspaceName}. Your active workspace is unchanged.`;
}

export function inviteAlreadyMemberMessage(workspaceName: string): string {
  return `You are already a member of ${workspaceName}.`;
}
