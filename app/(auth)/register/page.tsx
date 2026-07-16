import { RegisterForm } from "@/components/auth-forms";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-4 border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Register to start building planograms.
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
