import { ForgotPasswordForm } from "@/components/password-reset-forms";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-4 border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold">Forgot password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we will send a reset link if an account exists.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
