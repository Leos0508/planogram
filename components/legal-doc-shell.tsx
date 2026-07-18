import Link from "next/link";
import type { ReactNode } from "react";

export function LegalDocShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 justify-center overflow-y-auto p-4">
      <article className="w-full max-w-2xl space-y-4 border border-border bg-card p-6">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground">
            Last updated: July 18, 2026 · Placeholder copy for launch — not legal
            advice.
          </p>
        </div>
        <div className="space-y-3 text-sm text-foreground">{children}</div>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </article>
    </main>
  );
}
