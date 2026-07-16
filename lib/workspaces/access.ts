/** True when a record is missing or belongs to another workspace (treat as NOT_FOUND). */
export function isCrossWorkspaceMiss(
  recordWorkspaceId: string | null | undefined,
  currentWorkspaceId: string,
): boolean {
  return !recordWorkspaceId || recordWorkspaceId !== currentWorkspaceId;
}
