/** After switching workspace, leave detail routes that belong to the prior WS. */
export function catalogPathAfterSwitch(pathname: string): string | null {
  if (
    /^\/planograms\/[^/]+/.test(pathname) ||
    /^\/skus\/[^/]+/.test(pathname)
  ) {
    return "/planograms";
  }
  return null;
}
