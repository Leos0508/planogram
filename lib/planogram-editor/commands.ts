export type EditorCommand = {
  action: string;
  keys: string;
};

export const EDITOR_COMMANDS: EditorCommand[] = [
  { action: "Pan canvas", keys: "Middle mouse + drag" },
  { action: "Zoom", keys: "Scroll wheel" },
  { action: "Place SKU", keys: "Drag from tray" },
  { action: "Move item", keys: "Drag item" },
  { action: "Float (no Y snap)", keys: "Alt while dragging" },
  { action: "Resize shelf height", keys: "Drag shelf top border" },
  { action: "Increase facings", keys: "3" },
  { action: "Decrease facings", keys: "Shift + 3" },
  { action: "Nudge item", keys: "← →" },
  { action: "Nudge 10 mm", keys: "Shift + ← →" },
  { action: "Deselect", keys: "Click canvas" },
  { action: "Undo", keys: "Ctrl + Z" },
  { action: "Redo", keys: "Ctrl + Y" },
  { action: "Delete item", keys: "Delete" },
  { action: "Cancel drag", keys: "Esc" },
  { action: "Fit to view", keys: "Toolbar button" },
];
