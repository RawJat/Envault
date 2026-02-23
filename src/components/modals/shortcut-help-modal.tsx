"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { CornerDownLeft, Command } from "lucide-react";

interface ShortcutHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ModKey = () => (
  <>
    <Command className="w-3 h-3 mac-only" />
    <span className="non-mac-only">Ctrl</span>
  </>
);

export function ShortcutHelpModal({
  open,
  onOpenChange,
}: ShortcutHelpModalProps) {
  // Usage in shortcuts array
  const mod = <ModKey key="mod" />;

  const shortcuts = [
    {
      category: "Global",
      items: [
        { label: "Search / Command palette", keys: [mod, "K"] },
        { label: "Switch Theme", keys: ["T"] },
        { label: "Show Shortcuts", keys: ["Shift", "?"] },
        { label: "Toggle Notifications", keys: ["Shift", "B"] },
        { label: "Back to Dashboard", keys: ["Esc"] },
      ],
    },
    {
      category: "Navigation",
      items: [
        { label: "Go to Dashboard", keys: ["G", "H"] },
        { label: "Go to Settings", keys: ["G", "O"] },
        { label: "Go to Notifications", keys: ["G", "L"] },
        { label: "View Notification (in dialog)", keys: ["V"] },
      ],
    },
    {
      category: "Actions",
      items: [
        { label: "New Project / Variable", keys: ["N"] },
        {
          label: "Submit Form / Dialog",
          keys: [mod, <CornerDownLeft className="w-3 h-3" key="enter" />],
        },
        { label: "Save Changes", keys: [mod, "S"] },
      ],
    },
    {
      category: "Tabs",
      items: [{ label: "Switch Tabs", keys: ["1", "-", "9"] }],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] overflow-y-auto md:h-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Master the interface with these keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="font-semibold text-muted-foreground mb-3 text-sm uppercase tracking-wider">
                {section.category}
              </h3>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{item.label}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key, i) => (
                        <Kbd key={i} showOnMobile={true}>
                          {key}
                        </Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
