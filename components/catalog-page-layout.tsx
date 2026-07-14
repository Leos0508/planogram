import { cn } from "@/lib/utils";

type CatalogPageLayoutProps = {
  title: string;
  action?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  banner?: React.ReactNode;
  alert?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function CatalogPageLayout({
  title,
  action,
  search,
  filters,
  banner,
  alert,
  children,
  className,
}: CatalogPageLayoutProps) {
  const hasToolbar = Boolean(search ?? filters);

  return (
    <div
      className={cn("flex flex-1 flex-col gap-4 overflow-y-auto p-4", className)}
    >
      <header className="flex shrink-0 items-center justify-between gap-2">
        <h1 className="font-heading text-base font-semibold uppercase tracking-wider">
          {title}
        </h1>
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </header>

      {hasToolbar ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {search ? (
            <div className="min-w-0 flex-1 sm:max-w-sm">{search}</div>
          ) : null}
          {filters ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {filters}
            </div>
          ) : null}
        </div>
      ) : null}

      {banner ? <div className="shrink-0">{banner}</div> : null}
      {alert ? <div className="shrink-0">{alert}</div> : null}

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
