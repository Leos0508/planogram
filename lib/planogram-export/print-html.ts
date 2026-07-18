/**
 * Open the system print dialog for an HTML document.
 * Uses a same-origin hidden iframe — `window.open(..., "noopener")` leaves
 * about:blank empty because the opener cannot write into that document.
 */
export function printHtmlDocument(html: string): boolean {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Print export");
  // Must have a real layout size — 0×0 iframes often print blank in Chrome.
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-1";

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return false;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      // Keep the iframe until after the print dialog captures layout.
      window.setTimeout(() => {
        iframe.remove();
      }, 60_000);
    }
  };

  // document.write often skips iframe onload; poll for a painted body.
  const startedAt = Date.now();
  const waitForReady = () => {
    const body = frameDocument.body;
    const hasContent = Boolean(body && body.childElementCount > 0);
    if (hasContent || Date.now() - startedAt > 2000) {
      window.requestAnimationFrame(() => {
        window.setTimeout(triggerPrint, 50);
      });
      return;
    }
    window.setTimeout(waitForReady, 50);
  };

  waitForReady();
  return true;
}
