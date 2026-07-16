import AppNav from "@/components/app-nav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppNav />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </>
  );
}
