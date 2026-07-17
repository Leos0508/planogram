"use client";

import EditorSidebar from "@/components/editor-sidebar";
import PlanogramEditor from "@/components/planogram-editor";
import type { PlanogramDetail } from "@/lib/planograms/queries";
import type { Sku } from "@/lib/skus/queries";
import { WORKSPACE_READ_ONLY_HINT } from "@/lib/workspaces/capabilities";
import { useState } from "react";

export default function PlanogramEditorLayout({
  planogram,
  skus,
  canWrite,
}: {
  planogram: PlanogramDetail;
  skus: Sku[];
  canWrite: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(true);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!canWrite ? (
        <p className="shrink-0 border-b bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {WORKSPACE_READ_ONLY_HINT}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorSidebar
          planogram={planogram}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((open) => !open)}
          canWrite={canWrite}
        />

        <PlanogramEditor
          planogram={planogram}
          skus={skus}
          canWrite={canWrite}
          bottomMenuOpen={bottomMenuOpen}
          onBottomMenuToggle={() => setBottomMenuOpen((open) => !open)}
          panelLayoutKey={`${sidebarOpen}-${bottomMenuOpen}`}
        />
      </div>
    </div>
  );
}
