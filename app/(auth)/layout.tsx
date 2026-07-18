import { LegalFooter } from "@/components/legal-footer";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
        <LegalFooter />
      </div>
    </div>
  );
}
