import { useRef, useEffect, useCallback, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { formatSize, formatTime, shortType } from "@/lib/utils";
import type { HttpSession } from "@/types";
import Spinner from "./Spinner";
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

const ROW_HEIGHT = 24;

function dotClass(s: HttpSession): string {
  if (!s.complete) return "bg-orange-400";
  if (s.status === 0) return "bg-muted-foreground";
  if (s.status < 300) return "bg-[#00ca50]";
  if (s.status < 400) return "bg-[#fed000]";
  return "bg-destructive";
}

interface RowProps {
  id: number;
  session: HttpSession;
  isSelected: boolean;
  isPinned: boolean;
  onSelect: (id: number | null) => void;
  onTogglePin: (id: number) => void;
  onCopy: (text: string) => void;
}

const RequestRow = memo(function RequestRow({
  id,
  session: s,
  isSelected,
  isPinned,
  onSelect,
  onTogglePin,
  onCopy,
}: RowProps) {
  const fullUrl = getFullUrl(s);

  return (
    <ContextMenu>
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
            {!s.complete && s.status === 0 ? (
              <div className="flex items-center gap-1.5 opacity-70">
                <Spinner size={10} />
                <span>...</span>
              </div>
            ) : (
              <>
                {s.status || (s.complete ? "-" : "...")}{" "}
                {s.statusText && s.status !== 0 ? s.statusText : ""}
              </>
            )}
          </td>

          {/* Type */}
          <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary border-r border-r-border/20 group-[.selected]:border-r-primary text-[11px] truncate">
            {shortType(s.contentType) || (!s.complete ? <div className="flex items-center opacity-40 h-full"><Spinner size={10} /></div> : "")}
          </td>

          {/* Size */}
          <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary border-r border-r-border/20 group-[.selected]:border-r-primary tabular-nums text-right whitespace-nowrap">
            {s.responseSize ? formatSize(s.responseSize) : (!s.complete ? <div className="flex items-center justify-end opacity-40 h-full"><Spinner size={10} /></div> : "")}
          </td>

          {/* Duration */}
          <td className="h-6 px-2 m-0 border-b border-b-border/40 group-[.selected]:border-b-primary tabular-nums text-right whitespace-nowrap">
            {s.duration ? formatTime(s.duration) : (!s.complete ? <div className="flex items-center justify-end opacity-40 h-full"><Spinner size={10} /></div> : "")}
          </td>
        </tr>
      </ContextMenuTrigger>
      <ContextMenuContent className="text-[12px] min-w-48">
        <ContextMenuItem onClick={() => onTogglePin(id)}>
          {isPinned ? "Unpin Request" : "Pin Request"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onCopy(fullUrl)}>
          Copy URL
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCopy(s.path)}>
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
});

export default function RequestTable({
  sessions,
  order,
  selectedId,
  onSelect,
  pinnedIds,
  onTogglePin,
}: RequestTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const virtualizer = useVirtualizer({
    count: order.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 30,
  });

  // Track whether the user is at the bottom of the scroll area
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 25;
  };

  // Auto-scroll to bottom when new requests arrive (if user was already at bottom)
  useEffect(() => {
    if (isAtBottomRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [order.length]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  }, []);

  const virtualItems = virtualizer.getVirtualItems();

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
            {order.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground text-xs"
                >
                  No requests captured
                </td>
              </tr>
            ) : (
              <>
                {/* Top spacer row for virtualization */}
                {virtualItems.length > 0 && virtualItems[0].start > 0 && (
                  <tr>
                    <td colSpan={9} style={{ height: virtualItems[0].start }} />
                  </tr>
                )}

                {virtualItems.map((virtualRow) => {
                  const id = order[virtualRow.index];
                  const s = sessions.get(id);
                  if (!s) return null;

                  return (
                    <RequestRow
                      key={id}
                      id={id}
                      session={s}
                      isSelected={selectedId === id}
                      isPinned={pinnedIds.has(id)}
                      onSelect={onSelect}
                      onTogglePin={onTogglePin}
                      onCopy={handleCopy}
                    />
                  );
                })}

                {/* Bottom spacer row for virtualization */}
                {virtualItems.length > 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        height:
                          virtualizer.getTotalSize() -
                          (virtualItems[virtualItems.length - 1].end),
                      }}
                    />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
