"use client";

import { useState } from "react";
import { Download, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { toast } from "sonner";

type OS = "macOS" | "Linux" | "Windows";
type Arch = "x86_64" | "arm64" | "i386";

const ARCH_MAP: Record<OS, Arch[]> = {
  macOS: ["arm64", "x86_64"],
  Linux: ["x86_64", "arm64"],
  Windows: ["x86_64", "arm64"],
};

export function ManualInstallSelector() {
  const [os, setOs] = useState<OS>("macOS");
  const [arch, setArch] = useState<Arch>("arm64");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Sync architecture when OS changes and reset completed steps
  const handleOsChange = (newOs: OS) => {
    setOs(newOs);
    if (!ARCH_MAP[newOs].includes(arch)) {
      setArch(ARCH_MAP[newOs][0]);
    }
    // Reset completed steps when OS changes
    setCompletedSteps(new Set());
  };

  const handleArchChange = (newArch: Arch) => {
    setArch(newArch);
    // Reset completed steps when Arch changes (optional, but consistent)
    setCompletedSteps(new Set());
  };

  const markStepComplete = (step: number) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  };

  const handleDownload = () => {
    markStepComplete(1);
  };

  const handleCopyExtract = () => {
    navigator.clipboard.writeText(extractCmd);
    toast.success("Copied to clipboard");
    markStepComplete(2);
  };

  const handleCopyInstall = () => {
    navigator.clipboard.writeText(installCmd);
    toast.success("Copied to clipboard");
    markStepComplete(3);
  };

  const getBinaryName = (currentOs: OS, currentArch: Arch) => {
    const ext = currentOs === "Windows" ? "zip" : "tar.gz";
    const osName = currentOs === "macOS" ? "Darwin" : currentOs;
    return `envault_${osName}_${currentArch}.${ext}`;
  };

  const binaryName = getBinaryName(os, arch);
  const downloadUrl = `https://github.com/DinanathDash/Envault/releases/latest/download/${binaryName}`;

  const extractCmd =
    os === "Windows"
      ? `Expand-Archive -Path ${binaryName} -DestinationPath .`
      : `tar -xzf ${binaryName}`;

  const installCmd =
    os === "Windows"
      ? `# Add the directory to your Path manually`
      : `sudo mv envault /usr/local/bin/`;

  // Calculate total steps and completion
  // Windows: 2 interactive steps (download, extract) + 1 informational step
  // Mac/Linux: 3 interactive steps (download, extract, install)
  const interactiveSteps = os === "Windows" ? 2 : 3;
  const completedCount = Array.from(completedSteps).filter(
    (step) => step <= interactiveSteps,
  ).length;
  const allStepsComplete = completedCount === interactiveSteps;

  return (
    <div className="my-8 border border-muted rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
      <div className="p-4 border-b border-muted bg-muted/30 flex flex-row items-center gap-6">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Operating System
          </label>
          <Select value={os} onValueChange={(v) => handleOsChange(v as OS)}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder="Select OS" />
            </SelectTrigger>
            <SelectContent>
              {(["macOS", "Linux", "Windows"] as OS[]).map((plat) => (
                <SelectItem key={plat} value={plat} className="text-xs">
                  {plat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Architecture
          </label>
          <Select
            value={arch}
            onValueChange={(v) => handleArchChange(v as Arch)}
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder="Select Arch" />
            </SelectTrigger>
            <SelectContent>
              {ARCH_MAP[os].map((a) => {
                let label = "";
                if (os === "Windows") {
                  label =
                    a === "x86_64" ? "x86-64 (Intel/AMD)" : "ARM64 (Qualcomm)";
                } else if (os === "macOS") {
                  label =
                    a === "arm64" ? "ARM64 (Apple Silicon)" : "x86-64 (Intel)";
                } else if (os === "Linux") {
                  label = a === "x86_64" ? "x86/x86-64" : "ARM/ARM64";
                }
                return (
                  <SelectItem key={a} value={a} className="text-xs">
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-6">
        <Steps>
          <Step>
            <h4 className="font-bold mb-3">Download Binary</h4>
            <Button
              asChild
              className="h-10"
              variant="outline"
              onClick={handleDownload}
            >
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                <Download className="w-4 h-4" />
                {binaryName}
              </a>
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Or copy the link to use with <code>wget</code> or{" "}
              <code>curl</code>.
            </p>
            {completedSteps.has(1) && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                <Check className="w-3 h-3" />
                <span>Downloaded</span>
              </div>
            )}
          </Step>

          <Step>
            <h4 className="font-bold mb-3">Extract Archive</h4>
            <div onClick={handleCopyExtract} className="cursor-pointer">
              <DynamicCodeBlock lang="bash" code={extractCmd} />
            </div>
            {completedSteps.has(2) && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                <Check className="w-3 h-3" />
                <span>Copied</span>
              </div>
            )}
          </Step>

          <Step>
            <h4 className="font-bold mb-3">
              {os === "Windows" ? "Add to PATH" : "Move to PATH"}
            </h4>
            {os === "Windows" ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Add the directory containing <code>envault.exe</code> to your
                  User or System Environment Variables to use it from anywhere.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-semibold">Steps to add to PATH:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>
                      Open System Properties
                      <span className="inline-flex px-1">
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      Advanced Settings
                      <span className="inline-flex px-1">
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      Environment Variables
                    </li>
                    <li>
                      Under User Variables, select{" "}
                      <code className="font-mono">Path</code> and click Edit
                    </li>
                    <li>
                      Click New and add the folder path containing envault.exe
                    </li>
                    <li>Click OK to save and restart your terminal</li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                <div onClick={handleCopyInstall} className="cursor-pointer">
                  <DynamicCodeBlock lang="bash" code={installCmd} />
                </div>
                {completedSteps.has(3) && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    <span>Copied</span>
                  </div>
                )}
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Moving the binary to <code>/usr/local/bin</code> makes it
                  available system-wide as the <code>envault</code> command.
                </p>
              </>
            )}
          </Step>
        </Steps>

        <div className="pt-4 mt-4 border-t border-muted flex items-center gap-3">
          {allStepsComplete ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Check className="w-3 h-3" />
              Complete
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span>
                {completedCount}/{interactiveSteps} Steps
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            envault --version
          </span>
        </div>
      </div>
    </div>
  );
}
