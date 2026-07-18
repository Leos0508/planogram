import { LegalDocShell } from "@/components/legal-doc-shell";

export default function PrivacyPage() {
  return (
    <LegalDocShell title="Privacy Policy">
      <p>
        Planogram stores account information (such as email and display name),
        workspace membership, planograms, SKUs, and billing identifiers needed
        to operate the product.
      </p>
      <p>
        We use infrastructure providers on Stack A (including hosting, database,
        object storage, authentication, email delivery, and Stripe for payments)
        to process this data in order to provide the service.
      </p>
      <p>
        We do not sell your personal information. We retain data while your
        account and workspaces exist, and as needed for security, billing, and
        legal obligations.
      </p>
      <p>
        You may update profile fields in Settings and request account deletion
        where the product provides that control. Contact support for privacy
        questions when a support address is configured.
      </p>
    </LegalDocShell>
  );
}
