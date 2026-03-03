import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const [version, setVersion] = useState<string>("Loading...");

  useEffect(() => {
    if (open) {
      getVersion().then(setVersion).catch(console.error);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-1 border-border max-w-sm flex flex-col items-center justify-center p-8 gap-6 outline-none">
        <DialogTitle className="hidden">About PacketSniffer</DialogTitle>
        <DialogDescription className="hidden">
          Information about the PacketSniffer application
        </DialogDescription>

        <img
          src="/logo.png"
          alt="PacketSniffer"
          className="w-24 h-24 rounded-2xl shadow-sm border border-border mt-2"
        />

        <div className="text-center space-y-1">
          <p className="text-2xl font-chakra font-bold text-text-0 tracking-tight">
            PacketSniffer
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            Version {version}
          </p>
          <p className="text-xs text-muted-foreground px-4 pt-2">
            A native, cross-platform MITM HTTPS intercepting proxy built with
            Tauri, Rust, and React.
          </p>
        </div>

        <div className="flex gap-6 mt-2">
          <a
            href="https://packetsniffer.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline hover:text-text-0 transition-colors"
          >
            Website
          </a>
          <a
            href="https://github.com/WarFiN123/packetsniffer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline hover:text-text-0 transition-colors"
          >
            GitHub
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
