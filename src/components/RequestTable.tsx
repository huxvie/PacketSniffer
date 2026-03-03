import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatSize, formatTime, shortType } from "@/lib/utils";
import type { HttpSession } from "@/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  getFullUrl,
  exportToPostman,
  exportRequest,
  exportResponse,
} from "@/lib/exportUtils";

interface RequestTableProps {
  sessions: Map<number, HttpSession>;
  order: number[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  pinnedIds: Set<number>;
  onTogglePin: (id: number) => void;
}

function dotClass(s: HttpSession): string {
  if (!s.complete) return "bg-orange-400";
  if (s.status === 0) return "bg-muted-foreground";
  if (s.status < 300) return "bg-[#00ca50]";
  if (s.status < 400) return "bg-[#fed000]";
  return "bg-destructive";
}

export default function RequestTable({
  sessions,
  order,
  selectedId,
  onSelect,
  pinnedIds,
  onTogglePin,
}: RequestTableProps) {
  const bottomRef = useRef<HTMLTableRowElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // check if user is at bottom of the page
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 25;
  };

  // auto scroll only if alr at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [order.length]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background relative">
      <div
        className="flex-1 overflow-auto bg-background"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <table className="w-full text-left border-separate border-spacing-0 select-none outline-none table-fixed">
          <thead className="sticky top-0 z-10 bg-panel-header shadow-sm">
            <tr className="text-[11px] text-muted-foreground font-medium">
              <th className="font-normal px-2 h-6 w-6 border-b border-r border-border text-center"></th>
              <th className="font-normal px-2 h-6 w-6 border-b border-r border-border text-center">
                📌
              </th>
              <th className="font-normal px-2 h-6 w-12 border-b border-r border-border">
                ID
              </th>
              <th className="font-normal px-2 h-6 border-b border-r border-border">
                URL
              </th>
              <th className="font-normal px-2 h-6 w-16 border-b border-r border-border">
                Method
              </th>
              <th className="font-normal px-2 h-6 w-20 border-b border-r border-border">
                Status
              </th>
              <th className="font-normal px-2 h-6 w-16 border-b border-border">
                Type
              </th>
              <th className="font-normal px-2 h-6 w-20 border-b border-r border-border whitespace-nowrap">
                Size
              </th>
              <th className="font-normal px-2 h-6 w-20 border-b border-border whitespace-nowrap">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {order.map((id) => {
              const s = sessions.get(id);
              if (!s) return null;

              const isSelected = selectedId === id;
              const isPinned = pinnedIds.has(id);
              const fullUrl = getFullUrl(s);

              return (
                <ContextMenu key={id}>
                  <ContextMenuTrigger asChild>
                    <tr
                      onClick={() => onSelect(isSelected ? null : id)}
                      className={cn(
                        "group text-[12px] h-6 cursor-default",
                        isSelected
                          ? "selected bg-primary text-primary-foreground"
                          : "hover:bg-muted/50 text-foreground",
                      )}
                    >
                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary text-center border-r border-r-border/20 group-[.selected]:border-r-primary">
                        <span
                          className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            dotClass(s),
                          )}
                        />
                      </td>

                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary text-center border-r border-r-border/20 group-[.selected]:border-r-primary">
                        {isPinned ? (
                          <span className="text-yellow-500">📌</span>
                        ) : (
                          ""
                        )}
                      </td>

                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary border-r border-r-border/20 group-[.selected]:border-r-primary tabular-nums">
                        {s.id}
                      </td>

                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary border-r border-r-border/20 group-[.selected]:border-r-primary max-w-0 w-full truncate">
                        <span
                          className={cn(
                            "font-medium",
                            isSelected
                              ? "text-primary-foreground"
                              : "text-foreground",
                          )}
                        >
                          {s.host}
                        </span>
                        <span
                          className={cn(
                            isSelected
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {s.path}
                        </span>
                      </td>

                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary border-r border-r-border/20 group-[.selected]:border-r-primary text-[11px] font-medium">
                        {s.method}
                      </td>

                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary border-r border-r-border/20 group-[.selected]:border-r-primary text-[11px] font-medium tabular-nums">
                        {s.status || (s.complete ? "-" : "...")}{" "}
                        {s.statusText && s.status !== 0 ? s.statusText : ""}
                      </td>

                      {/* Type */}
                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary text-[11px] truncate">
                        {shortType(s.contentType)}
                      </td>

                      {/* Size */}
                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary border-r border-r-border/20 group-[.selected]:border-r-primary tabular-nums text-right whitespace-nowrap">
                        {s.responseSize ? formatSize(s.responseSize) : ""}
                      </td>

                      {/* Duration */}
                      <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary tabular-nums text-right whitespace-nowrap">
                        {s.duration ? formatTime(s.duration) : ""}
                      </td>
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="text-[12px] min-w-48">
                    <ContextMenuItem onClick={() => onTogglePin(id)}>
                      {isPinned ? "Unpin Request" : "Pin Request"}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => handleCopy(fullUrl)}>
                      Copy URL
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCopy(s.path)}>
                      Copy Path
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => exportToPostman(s)}>
                      Open in Postman
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => exportRequest(s)}>
                      Export Request...
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => exportResponse(s)}>
                      Export Response...
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            {order.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground text-xs"
                >
                  No requests captured
                </td>
              </tr>
            )}
            <tr ref={bottomRef} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
