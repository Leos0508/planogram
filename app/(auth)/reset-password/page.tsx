import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-reset-forms";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-4 border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a new password for your account.
          </p>
        </div>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-destructive" role="alert">
              Reset link is invalid or missing.
            </p>
            <p className="text-sm text-muted-foreground">
              <Link
                href="/forgot-password"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Request a new link
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
