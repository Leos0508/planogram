/**
 * PlanogramEngine — pure TypeScript placement math (mm).
 *
 * Pipeline:  state → layout → drop-zone → snap → placement
 *
 *   types       domain model
 *   constant    tunables + px↔mm
 *   coords      pointer space conversions
 *   layout      shelf rows, item rects, bounds
 *   drop-zone   shelf hit-testing for drops
 *   snap        edge snap to sibling items
 *   placement   collision check
 *   project-drop  pointer → placement projection
 *   adapter     DB/query → state
 */

export * from "./facings";
export * from "./adapter";
export * from "./constant";
export * from "./coords";
export * from "./drop-zone";
export * from "./layout";
export * from "./nudge";
export * from "./placement";
export * from "./project-drop";
export * from "./snap";
export * from "./layout-cache";
export * from "./shelf-helpers";
export * from "./types";
