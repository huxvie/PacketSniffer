import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PackageOpen, Check, X } from "lucide-react";
import Spinner from "./Spinner";

interface DependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingDeps: string[];
}

type DepStatus = "pending" | "installing" | "installed" | "failed";

export default function DependencyDialog({
  open,
  onOpenChange,
  missingDeps,
}: DependencyDialogProps) {
  const [statuses, setStatuses] = useState<Record<string, DepStatus>>({});
  const [errorMsg, setErrorMsg] = useState<Record<string, string>>({});

  const handleInstall = async (pkg: string) => {
    setStatuses((prev) => ({ ...prev, [pkg]: "installing" }));
    setErrorMsg((prev) => ({ ...prev, [pkg]: "" }));
    try {
      await invoke<string>("install_dependency", { package: pkg });
      setStatuses((prev) => ({ ...prev, [pkg]: "installed" }));
    } catch (err) {
      setStatuses((prev) => ({ ...prev, [pkg]: "failed" }));
      setErrorMsg((prev) => ({ ...prev, [pkg]: String(err) }));
    }
  };

  const handleInstallAll = async () => {
    for (const pkg of missingDeps) {
      if (statuses[pkg] !== "installed") {
        await handleInstall(pkg);
      }
    }
  };

  const allDone = missingDeps.every((d) => statuses[d] === "installed");

  const descriptions: Record<string, string> = {
    "libnss3-tools":
      "Required for Firefox certificate trust. Without it, Firefox will show security warnings for HTTPS sites.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-1 border-border max-w-md p-6 overflow-hidden flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle className="font-chakra text-text-0 text-lg flex items-center gap-2">
            <PackageOpen className="size-5 text-yellow-500" />
            Missing Dependencies
          </DialogTitle>
          <DialogDescription className="text-text-2 text-sm hidden">
            Install missing system packages
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-text-1 leading-relaxed">
          Some system packages are needed for full functionality. Would you like
          to install them?
        </p>

        <div className="space-y-3">
          {missingDeps.map((pkg) => {
            const status = statuses[pkg] || "pending";
            return (
              <div
                key={pkg}
                className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-text-0">
                      {pkg}
                    </span>
                    {status === "installed" && (
                      <Check className="size-4 text-green-500" />
                    )}
                    {status === "failed" && (
                      <X className="size-4 text-destructive" />
                    )}
                  </div>
                  {descriptions[pkg] && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {descriptions[pkg]}
                    </p>
                  )}
                  {status === "failed" && errorMsg[pkg] && (
                    <p className="text-xs text-destructive mt-1">
                      {errorMsg[pkg]}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {status === "pending" && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleInstall(pkg)}
                    >
                      Install
                    </Button>
                  )}
                  {status === "installing" && <Spinner size={16} />}
                  {status === "failed" && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleInstall(pkg)}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {allDone ? "Done" : "Skip"}
          </Button>
          {!allDone && (
            <Button size="sm" onClick={handleInstallAll}>
              Install All
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
