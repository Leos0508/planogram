/** Slug for export filenames (lowercase kebab-case). Empty when name has no alphanumerics. */
export function slugifyPlanogramExportName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

/**
 * Suggested Save-as-PDF filename (`document.title` hint for the print path).
 * Example: "Demo Bay" → `planogram_demo-bay.pdf`
 */
export function planogramPdfExportFilename(name: string): string {
  const slug = slugifyPlanogramExportName(name);
  return slug ? `planogram_${slug}.pdf` : "planogram.pdf";
}
