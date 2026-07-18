import { LegalDocShell } from "@/components/legal-doc-shell";

export default function TermsPage() {
  return (
    <LegalDocShell title="Terms of Service">
      <p>
        By creating an account or using Planogram, you agree to use the service
        lawfully and not to misuse other users’ workspaces or data.
      </p>
      <p>
        Workspaces and content you create remain associated with your account
        subject to membership and billing rules. We may suspend accounts that
        abuse the service or violate these terms.
      </p>
      <p>
        The service is provided “as is” during early access. Features, Free-tier
        limits, and pricing may change. Paid plans are billed through Stripe per
        workspace.
      </p>
      <p>
        If you have questions, contact support via the address published in the
        app (when configured).
      </p>
    </LegalDocShell>
  );
}
