import { SettingsSideNav } from "@/components/settings-side-nav";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside
        className="w-52 shrink-0 border-r p-4"
        aria-label="Settings"
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Settings
        </p>
        <SettingsSideNav />
      </aside>
      <div className="min-h-0 flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
