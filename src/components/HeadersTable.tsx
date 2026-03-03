import type { HttpHeader } from "@/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface HeadersTableProps {
  headers: HttpHeader[];
}

export default function HeadersTable({ headers }: HeadersTableProps) {
  if (headers.length === 0) {
    return (
      <div className="p-3 text-[11px] text-muted-foreground">No headers</div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="w-full">
      <table className="w-full text-left border-collapse table-fixed">
        <thead className="bg-panel-header text-[11px] text-muted-foreground font-medium border-b border-border">
          <tr>
            <th className="font-normal px-2 py-1 w-1/3 border-r border-border">
              Key
            </th>
            <th className="font-normal px-2 py-1">Value</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((h, i) => (
            <ContextMenu key={`${h.name}-${i}`}>
              <ContextMenuTrigger asChild>
                <tr className="border-b border-border/50 text-[11px] hover:bg-muted/50 transition-colors">
                  <td
                    className="px-2 py-0.75 border-r border-border/50 text-foreground font-medium truncate max-w-37.5"
                    title={h.name}
                  >
                    {h.name}
                  </td>
                  <td className="px-2 py-0.75 text-foreground font-mono break-all selection:bg-primary selection:text-primary-foreground">
                    {h.value}
                  </td>
                </tr>
              </ContextMenuTrigger>
              <ContextMenuContent className="text-[12px] min-w-48">
                <ContextMenuItem onClick={() => handleCopy(h.name)}>
                  Copy Name
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopy(h.value)}>
                  Copy Value
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => handleCopy(`${h.name}: ${h.value}`)}
                >
                  Copy Header Line
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </tbody>
      </table>
    </div>
  );
}
