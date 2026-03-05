import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/Spinner";

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UpdateDialog({
  open,
  onOpenChange,
}: UpdateDialogProps) {
  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "uptodate" | "error" | "downloading"
  >("idle");
  const [version, setVersion] = useState("");
  const [error, setError] = useState("");
  const [updateObj, setUpdateObj] = useState<any>(null);

  useEffect(() => {
    if (open) {
      checkUpdate();
    } else {
      setStatus("idle");
    }
  }, [open]);

  const checkUpdate = async () => {
    setStatus("checking");
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        setVersion(update.version);
        setUpdateObj(update);
        setStatus("available");
      } else {
        setStatus("uptodate");
      }
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  };

  const doUpdate = async () => {
    if (updateObj) {
      setStatus("downloading");
      try {
        await updateObj.downloadAndInstall();
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch (e) {
        setError(String(e));
        setStatus("error");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-1 border-border max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className="font-chakra text-text-0 text-xl">
            Updater
          </DialogTitle>
          <DialogDescription className="hidden">
            Check for updates to PacketSniffer
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6 min-h-30">
          {status === "checking" && (
            <div className="flex flex-col items-center gap-3">
              <Spinner size={24} />
              <p className="text-sm font-medium text-text-1">
                Checking for updates...
              </p>
            </div>
          )}
          {status === "downloading" && (
            <div className="flex flex-col items-center gap-3">
              <Spinner size={24} />
              <p className="text-sm font-medium text-text-1">
                Downloading and installing update...
              </p>
            </div>
          )}
          {status === "uptodate" && (
            <p className="text-sm font-medium text-text-1">
              You are on the latest version.
            </p>
          )}
          {status === "available" && (
            <div className="flex flex-col w-full gap-6">
              <div className="text-center">
                <p className="text-sm text-text-1 mb-1">
                  A new update is available!
                </p>
                <p className="text-2xl font-chakra font-bold text-text-0">
                  {version}
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="w-1/2"
                  onClick={() => onOpenChange(false)}
                >
                  Later
                </Button>
                <Button onClick={doUpdate} className="w-1/2">
                  Install
                </Button>
              </div>
            </div>
          )}
          {status === "error" && (
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-destructive">
                Failed to check for updates
              </p>
              <p className="text-xs text-muted-foreground break-all">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
