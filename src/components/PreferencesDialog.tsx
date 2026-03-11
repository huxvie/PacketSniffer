import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Theme } from "@/hooks/useTheme";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ShieldCheck } from "lucide-react";
import Spinner from "./Spinner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "./ui/input-group";

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onPortChange?: (port: number) => void;
}

export default function PreferencesDialog({
  open,
  onOpenChange,
  theme,
  onThemeChange,
  onPortChange,
}: PreferencesDialogProps) {
  const [caStatus, setCaStatus] = useState<string | null>(null);
  const [installingCa, setInstallingCa] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [port, setPort] = useState("8080");
  const [portSaved, setPortSaved] = useState(false);

  useEffect(() => {
    if (open) {
      invoke<string>("get_proxy_status")
        .then((status) => {
          const match = status.match(/port (\d+)/);
          if (match) {
            setPort(match[1]);
          }
        })
        .catch(() => {});
      setCaStatus(null);
      setPortSaved(false);
    }
  }, [open]);

  const handleReinstallCA = async () => {
    setInstallingCa(true);
    setCaStatus("Installing...");
    try {
      const result = await invoke<string>("install_ca_certificate");
      setCaStatus(result);
    } catch (e) {
      setCaStatus(`Error: ${e}`);
    } finally {
      setInstallingCa(false);
    }
  };

  const handleSavePort = async () => {
    setLoading(true);
    setPortSaved(false);
    try {
      const parsedPort = parseInt(port, 10);
      if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        setCaStatus("Invalid port number (1–65535)");
        return;
      }
      await invoke("set_proxy_port", { port: parsedPort });
      onPortChange?.(parsedPort);
      setPortSaved(true);
      setTimeout(() => setPortSaved(false), 2000);
    } catch (e) {
      setCaStatus(`Port change failed: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-1 border-border max-w-sm p-6 overflow-hidden flex flex-col gap-6">
        <DialogHeader>
          <DialogTitle className="font-chakra text-text-0 text-xl">
            Preferences
          </DialogTitle>
          <DialogDescription className="text-text-2 hidden">
            Configure PacketSniffer settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Network
          </h3>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-text-1">Proxy Listening Port</Label>
            <div className="flex items-center gap-2">
              <InputGroup className="rounded-full">
                <InputGroupInput
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  type="number"
                  min="1"
                  max="65535"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePort();
                  }}
                />
                <InputGroupAddon
                  align={"inline-end"}
                  onClick={handleSavePort}
                  className={loading ? "cursor-wait" : "cursor-pointer"}
                >
                  {loading ? (
                    <Spinner />
                  ) : portSaved ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Check className="size-4 hover:text-primary" />
                  )}
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-text-1">Theme</Label>
            </div>
            <Select
              value={theme}
              onValueChange={(val) => onThemeChange(val as Theme)}
            >
              <SelectTrigger className="w-30 h-8 text-sm">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Certificate
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-muted-foreground" />
                <span className="text-sm text-text-1">
                  CA Certificate
                </span>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={handleReinstallCA}
                disabled={installingCa}
              >
                {installingCa && <Spinner className="mr-2" size={14} />}
                {installingCa ? "Installing" : "Reinstall"}
              </Button>
            </div>
            {caStatus && !installingCa && (
              <p className={`text-xs ${caStatus.startsWith("Error") ? "text-destructive" : "text-muted-foreground"}`}>
                {caStatus}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
