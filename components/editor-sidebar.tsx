"use client";

import PlanogramSettingsPanel from "@/components/planogram-settings-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlanogramDetail } from "@/lib/planograms/queries";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";

export default function EditorSidebar({
  planogram,
  open,
  onToggle,
}: {
  planogram: PlanogramDetail;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
        open ? "w-72" : "w-11",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b p-2",
          open ? "justify-between" : "justify-center",
        )}
      >
        {open ? (
          <h3 className="min-w-0 truncate px-2 font-mono text-sm font-semibold">
            {planogram.name}
          </h3>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={open}
        >
          {open ? (
            <PanelLeftCloseIcon className="size-4" />
          ) : (
            <PanelLeftOpenIcon className="size-4" />
          )}
        </Button>
      </div>

      {open ? (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          <PlanogramSettingsPanel planogram={planogram} />
        </div>
      ) : null}
    </aside>
  );
}
