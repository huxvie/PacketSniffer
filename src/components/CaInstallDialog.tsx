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
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import Spinner from "./Spinner";

interface CaInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type InstallState = "prompt" | "installing" | "success" | "error";

export default function CaInstallDialog({
  open,
  onOpenChange,
}: CaInstallDialogProps) {
  const [state, setState] = useState<InstallState>("prompt");
  const [resultMessage, setResultMessage] = useState("");

  const handleInstall = async () => {
    setState("installing");
    try {
      const result = await invoke<string>("install_ca_certificate");
      setResultMessage(result);
      setState("success");
    } catch (err) {
      setResultMessage(String(err));
      setState("error");
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setTimeout(() => {
        setState("prompt");
        setResultMessage("");
      }, 200);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-bg-1 border-border max-w-sm p-6 overflow-hidden flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle className="font-chakra text-text-0 text-lg flex items-center gap-2">
            {state === "success" ? (
              <ShieldCheck className="size-5 text-green-500" />
            ) : state === "error" ? (
              <ShieldAlert className="size-5 text-destructive" />
            ) : (
              <AlertTriangle className="size-5 text-yellow-500" />
            )}
            CA Certificate
          </DialogTitle>
          <DialogDescription className="text-text-2 text-sm hidden">
            Install the PacketSniffer root CA certificate
          </DialogDescription>
        </DialogHeader>

        {state === "prompt" && (
          <div className="space-y-4">
            <p className="text-sm text-text-1 leading-relaxed">
              The PacketSniffer CA certificate is not trusted by your system.
              HTTPS interception requires this certificate to be installed.
            </p>
            <p className="text-xs text-muted-foreground">
              This requires administrator/root privileges. The certificate is
              only used locally for traffic inspection.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClose(false)}
              >
                Skip
              </Button>
              <Button size="sm" onClick={handleInstall}>
                Install Certificate
              </Button>
            </div>
          </div>
        )}

        {state === "installing" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Spinner size={28} />
            <p className="text-sm text-text-1">
              Installing certificate...
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Please follow any system prompts that appear.
            </p>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <p className="text-sm text-text-1 leading-relaxed">
              {resultMessage}
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <p className="text-sm text-destructive leading-relaxed">
              {resultMessage}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClose(false)}
              >
                Close
              </Button>
              <Button size="sm" onClick={handleInstall}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
