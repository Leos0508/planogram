import { Button } from "@/components/ui/button";
import { LayoutGridIcon, PackageIcon } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Retail layout editor
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            Planogram
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Build shelf layouts in millimeters. Drag products onto shelves,
            adjust facings, and export your plan.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/planograms">
              <LayoutGridIcon className="size-4" />
              Planograms
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/skus">
              <PackageIcon className="size-4" />
              SKUs
            </Link>
          </Button>
        </div>

        <ol className="w-full border-t pt-6 text-left text-sm text-muted-foreground">
          <li className="flex gap-3 py-2">
            <span className="font-mono text-xs text-primary">1</span>
            Add SKUs with width and height in mm
          </li>
          <li className="flex gap-3 py-2">
            <span className="font-mono text-xs text-primary">2</span>
            Create a planogram and drag items onto shelves
          </li>
          <li className="flex gap-3 py-2">
            <span className="font-mono text-xs text-primary">3</span>
            Export SVG or refine layout with shelf tools
          </li>
        </ol>
      </main>
    </div>
  );
}
