import { Search, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { message } from "@tauri-apps/plugin-dialog";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

interface ToolbarProps {
  connected: boolean;
  onOpenPreferences: () => void;
  onOpenUpdate: () => void;
  onOpenAbout: () => void;
  onExportSession: () => void;
  textFilter: string;
  onTextChange: (value: string) => void;
}

export default function Toolbar({
  connected: _connected,
  onOpenPreferences,
  onOpenUpdate,
  onOpenAbout,
  onExportSession,
  textFilter,
  onTextChange,
}: ToolbarProps) {
  const handleQuit = async () => {
    try {
      await invoke("stop_proxy");
    } catch (e) {
      console.error("Failed to stop proxy on quit:", e);
    }
    await getCurrentWindow().close();
  };

  const handleInstallCa = async () => {
    try {
      const msg = await invoke<string>("install_ca_certificate");
      await message(msg, {
        title: "CA Certificate Installation",
        kind: "info",
      });
    } catch (err) {
      await message(String(err), {
        title: "CA Installation Failed",
        kind: "error",
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.buttons === 1 &&
      (e.target as HTMLElement).hasAttribute("data-tauri-drag-region")
    ) {
      getCurrentWindow().startDragging();
    }
  };

  return (
    <div
      className="flex flex-col bg-background border-b border-border select-none shrink-0"
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
    >
      {/* Top row: Menu bar + Window controls area (macOS style space or Windows controls space depending on OS) */}
      <div className="flex items-center justify-between h-9 px-2 gap-2" data-tauri-drag-region>
        <div className="flex items-center gap-2" data-tauri-drag-region>
          {/* Logo / Brand */}
          <div className="font-bold text-sm px-2 text-primary tracking-tight flex items-center gap-1.5 font-chakra pointer-events-none">
            <img src="/logo.png" alt="Logo" className="w-4 h-4 rounded-sm" />
            PacketSniffer
          </div>

          <Menubar className="border-none bg-transparent h-7 p-0 gap-0">
            <MenubarMenu>
              <MenubarTrigger className="h-7 px-2 text-xs font-medium cursor-default">
                File
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={onExportSession}>
                  Export Session... <MenubarShortcut>⌘S</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={onOpenPreferences}>
                  Preferences
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={handleQuit}>Quit</MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="h-7 px-2 text-xs font-medium cursor-default">
                Help
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={handleInstallCa}>
                  Install CA Certificate...
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem>
                  <a
                    href="https://github.com/WarFiN123/packetsniffer"
                    target="_blank"
                  >
                    Report an Issue
                  </a>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={onOpenUpdate}>
                  Check for Updates...
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={onOpenAbout}>
                  About PacketSniffer
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>

        {/* Filter on the top right */}
        <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-md px-2 h-6 min-w-50 group focus-within:ring-1 focus-within:ring-ring z-10">
          <Search className="size-3.5 text-muted-foreground group-focus-within:text-primary" />
          <input
            type="text"
            value={textFilter}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Filter (Ctrl + F)"
            className="bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground outline-none flex-1 min-w-0 font-medium"
          />
          {textFilter && (
            <button
              onClick={() => onTextChange("")}
              className="text-muted-foreground hover:text-foreground text-xs leading-none shrink-0"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
