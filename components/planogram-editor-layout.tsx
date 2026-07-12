"use client";

import EditorSidebar from "@/components/editor-sidebar";
import PlanogramEditor from "@/components/planogram-editor";
import type { PlanogramDetail } from "@/lib/planograms/queries";
import type { Sku } from "@/lib/skus/queries";
import { useState } from "react";

export default function PlanogramEditorLayout({
  planogram,
  skus,
}: {
  planogram: PlanogramDetail;
  skus: Sku[];
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(true);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <EditorSidebar
        planogram={planogram}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
      />

      <PlanogramEditor
        planogram={planogram}
        skus={skus}
        bottomMenuOpen={bottomMenuOpen}
        onBottomMenuToggle={() => setBottomMenuOpen((open) => !open)}
        panelLayoutKey={`${sidebarOpen}-${bottomMenuOpen}`}
      />
    </div>
  );
}
