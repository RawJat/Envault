"use client";

import { useState } from "react";
import { Terminal, Clipboard, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

export function InstallTerminal({
  command,
  label,
}: {
  command: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    toast.success("Command copied to clipboard");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <div className="border border-primary/20 bg-background/50 backdrop-blur-sm rounded-none overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2 font-mono text-xs flex items-center justify-between">
          <span>[{label.toUpperCase()}]</span>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={copyToClipboard}
                  className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                  aria-label="Copy command"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clipboard className="w-4 h-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy and run this command</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="p-4 font-mono text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">$</span>
            <span className="text-foreground break-all">{command}</span>
          </div>
          <div className="text-muted-foreground/60 text-xs mt-2">
            {`>> INSTALL | SECURE | READY`}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
