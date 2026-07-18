import Link from "next/link";
import { getSupportEmail, getSupportMailto } from "@/lib/support";

export function LegalFooter() {
  const supportMailto = getSupportMailto();
  const supportEmail = getSupportEmail();

  return (
    <footer className="mt-auto border-t border-border px-4 py-3">
      <nav
        aria-label="Legal"
        className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
      >
        <Link
          href="/terms"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Terms
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          href="/privacy"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Privacy
        </Link>
        {supportMailto && supportEmail ? (
          <>
            <span aria-hidden="true">·</span>
            <a
              href={supportMailto}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Support
            </a>
          </>
        ) : null}
      </nav>
    </footer>
  );
}
