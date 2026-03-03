// completely vibecoded

import CodeViewer from "./CodeViewer";
import { useState, useRef, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KiB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function BodyViewer({
  body,
  isJson,
  contentType = "",
}: {
  body: string;
  isJson: boolean;
  contentType?: string;
}) {
  const [imgDim, setImgDim] = useState<{ w: number; h: number } | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (
    body.startsWith("__BASE64__:text") ||
    body.startsWith("__BASE64__:application") ||
    body.startsWith("__BASE64__:image") ||
    body.startsWith("__BASE64__:video") ||
    body.startsWith("__BASE64__:audio") ||
    body.startsWith("__BASE64__:font") ||
    body.startsWith("__BASE64__:1") ||
    body.startsWith("__BASE64__:0") ||
    body.startsWith("__BASE64__:")
  ) {
    const parts = body.split(":");
    if (parts.length >= 3) {
      const mime = parts[1];
      const b64 = parts.slice(2).join(":");
      const src = `data:${mime};base64,${b64}`;
      const sizeBytes = Math.round((b64.length * 3) / 4);

      if (mime.startsWith("image/")) {
        return (
          <div className="flex flex-col min-h-full">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-panel-header text-[10px] text-muted-foreground shrink-0">
              <span className="font-mono">{mime}</span>
              <div className="flex gap-3">
                {imgDim && (
                  <span>
                    {imgDim.w} × {imgDim.h}
                  </span>
                )}
                <span>{formatBytes(sizeBytes)}</span>
              </div>
            </div>
            <div className="flex-1 p-4 flex justify-center bg-muted/10 overflow-auto">
              <img
                src={src}
                alt="Response preview"
                className="max-w-full max-h-[80vh] object-contain shadow-sm border border-border bg-background transition-opacity duration-200"
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  setImgDim({ w: img.naturalWidth, h: img.naturalHeight });
                }}
              />
            </div>
          </div>
        );
      } else if (mime.startsWith("video/")) {
        return (
          <div className="flex flex-col min-h-full">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-panel-header text-[10px] text-muted-foreground shrink-0">
              <span className="font-mono">{mime}</span>
              <span>{formatBytes(sizeBytes)}</span>
            </div>
            <div className="flex-1 p-4 flex justify-center bg-muted/10 overflow-auto">
              <video
                controls
                src={src}
                className="max-w-full shadow-sm border border-border bg-background"
              />
            </div>
          </div>
        );
      } else if (mime.startsWith("audio/")) {
        return (
          <div className="flex flex-col min-h-full">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-panel-header text-[10px] text-muted-foreground shrink-0">
              <span className="font-mono">{mime}</span>
              <span>{formatBytes(sizeBytes)}</span>
            </div>
            <div className="flex-1 p-4 flex justify-center items-center bg-muted/10 overflow-auto">
              <audio controls src={src} className="w-full max-w-md" />
            </div>
          </div>
        );
      }
    }
  }

  if (
    body.startsWith("__HEX__:text") ||
    body.startsWith("__HEX__:application") ||
    body.startsWith("__HEX__:size") ||
    body.startsWith("__HEX__:__") ||
    body.startsWith("__HEX__:")
  ) {
    const parts = body.split(":");
    if (parts.length >= 3) {
      const sizeStr = parts[1];
      const hexStr = parts.slice(2).join(":");

      const bytes = hexStr.match(/.{1,2}/g) || [];
      const lines = [];
      for (let i = 0; i < bytes.length; i += 16) {
        lines.push(bytes.slice(i, i + 16));
      }

      return (
        <div className="flex flex-col min-h-full bg-background">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-panel-header text-[10px] text-muted-foreground shrink-0">
            <span className="font-mono">Binary Preview</span>
            <span>{sizeStr}</span>
          </div>
          <div className="p-2 text-[11px] font-mono text-foreground flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <tbody>
                {lines.map((line, idx) => {
                  const offset = (idx * 16).toString(16).padStart(8, "0");
                  const hexPart = line.join(" ");
                  const asciiPart = line
                    .map((b) => {
                      const c = parseInt(b, 16);
                      return c >= 32 && c <= 126 ? String.fromCharCode(c) : ".";
                    })
                    .join("");

                  return (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="pr-4 text-muted-foreground select-none">
                        {offset}
                      </td>
                      <td className="pr-4 tracking-widest">
                        {hexPart.padEnd(16 * 3 - 1, " ")}
                      </td>
                      <td className="text-muted-foreground">{asciiPart}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {bytes.length >= 10240 && (
              <div className="text-muted-foreground mt-4 italic border-t border-border pt-2">
                Preview truncated at 10KB...
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  if (
    isJson ||
    contentType.includes("json") ||
    contentType.includes("html") ||
    contentType.includes("xml") ||
    contentType.includes("javascript")
  ) {
    return (
      <CodeViewer
        content={body}
        contentType={isJson ? "application/json" : contentType}
      />
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex flex-col min-h-full h-full bg-background w-full">
          <div className="flex items-center justify-end px-2 py-1.5 border-b border-border bg-panel-header gap-2 shrink-0">
            <button
              onClick={() => handleCopy(body)}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-transparent hover:border-border hover:bg-muted transition-colors"
            >
              Copy Body
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap break-all selection:bg-primary selection:text-primary-foreground">
              {body}
            </pre>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="text-[12px] min-w-40">
        <ContextMenuItem onClick={() => handleCopy(body)}>
          Copy Full Body
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
