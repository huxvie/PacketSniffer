import { cn } from "@/lib/utils";
import { formatWsTime } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WsMessage } from "@/types";

interface MessagesTabProps {
  messages: WsMessage[];
}

export default function MessagesTab({ messages }: MessagesTabProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-2 text-xs">
        No WebSocket messages
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border/50">
        {messages.map((msg, i) => (
          <div key={i} className="flex flex-col px-3 py-1.5">
            <div className="flex items-center gap-2 text-[10px]">
              <span
                className={cn(
                  "font-mono font-bold",
                  msg.direction === "send" ? "text-green" : "text-cyan",
                )}
              >
                {msg.direction === "send" ? "\u2191" : "\u2193"}
              </span>

              <span className="text-text-2 uppercase">{msg.opcode}</span>

              <span className="text-text-2 tabular-nums">{msg.length} B</span>

              <span className="text-text-2 tabular-nums ml-auto">
                {formatWsTime(msg.timestampMs)}
              </span>
            </div>

            {msg.data && (
              <pre className="mt-1 text-[11px] font-mono text-text-1 whitespace-pre-wrap break-all leading-4 max-h-32 overflow-hidden">
                {msg.data}
              </pre>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
