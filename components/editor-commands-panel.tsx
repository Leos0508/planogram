"use client";

import { Button } from "@/components/ui/button";
import { EDITOR_COMMANDS } from "@/lib/planogram-editor/commands";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, KeyboardIcon } from "lucide-react";
import { useState } from "react";

export default function EditorCommandsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 flex max-w-xs flex-col items-start gap-2">
      {open ? (
        <div className="w-64 rounded-md border border-border bg-background/95 p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Commands
          </p>
          <ul className="space-y-1.5">
            {EDITOR_COMMANDS.map((command) => (
              <li
                key={command.action}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
                <span className="text-foreground">{command.action}</span>
                <kbd className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {command.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shadow-sm normal-case tracking-normal"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        title="Keyboard and mouse commands"
      >
        <KeyboardIcon className="size-3.5" />
        Commands
        <ChevronDownIcon
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </Button>
    </div>
  );
}
