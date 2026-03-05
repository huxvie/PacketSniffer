import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import HeadersTable from "./HeadersTable";
import BodyViewer from "./BodyViewer";
import MessagesTab from "./MessagesTab";
import Spinner from "./Spinner";
import type { HttpSession, WsMessage } from "@/types";
import {
  parseQueryParams,
  getFullUrl,
  exportToPostman,
  exportRequest,
  exportResponse,
  getRawRequest,
  getRawResponse,
} from "@/lib/exportUtils";

interface DetailPanelProps {
  session: HttpSession | null;
  wsMessages: WsMessage[];
}

type RequestTab = "Header" | "Query" | "Cookies" | "Body";
type ResponseTab = "Header" | "Cookies" | "Body" | "Messages";

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 h-full text-[12px] font-medium transition-colors border-b-2",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold tracking-wide shadow-sm border border-border/50">
      {method}
    </span>
  );
}

function StatusBadge({
  status,
  statusText,
}: {
  status: number;
  statusText: string;
}) {
  if (status === 0) return null;
  let bg = "bg-muted text-muted-foreground";
  if (status >= 200 && status < 300) bg = "bg-status-success text-secondary";
  else if (status >= 300 && status < 400) bg = "bg-status-redirect text-white";
  else if (status >= 400) bg = "bg-destructive text-destructive-foreground";

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide shadow-sm",
        bg,
      )}
    >
      {status} {statusText}
    </span>
  );
}

export default function DetailPanel({ session, wsMessages }: DetailPanelProps) {
  const [reqTab, setReqTab] = useState<RequestTab>("Header");
  const [resTab, setResTab] = useState<ResponseTab>("Header");

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-muted-foreground text-xs">
        Select a request to inspect
      </div>
    );
  }

  const isWs = session.scheme === "ws" || session.scheme === "wss";
  const queryParams = parseQueryParams(session.path);
  const hasQuery = queryParams.length > 0;
  const hasReqBody = !!session.requestBody;
  const hasResBody = !!session.responseBody;
  const isJson = (session.contentType || "").includes("json");

  const requestCookies = session.requestHeaders
    .filter((h) => h.name.toLowerCase() === "cookie")
    .flatMap((h) =>
      h.value.split(";").map((c) => {
        const [k, ...v] = c.split("=");
        return [k.trim(), v.join("=")];
      }),
    ) as [string, string][];

  const responseCookies = session.responseHeaders
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => {
      const parts = h.value.split(";");
      const [k, ...v] = parts[0].split("=");
      return [k.trim(), v.join("=")];
    }) as [string, string][];

  const hasReqCookies = requestCookies.length > 0;
  const hasResCookies = responseCookies.length > 0;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const fullUrl = getFullUrl(session);

  return (
    <div className="h-full flex flex-col bg-background">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex items-center gap-2 px-3 h-9 border-b border-border bg-panel-header shrink-0 select-none">
            <MethodBadge method={session.method} />
            <StatusBadge
              status={session.status}
              statusText={session.statusText}
            />

            <span
              className="flex-1 min-w-0 truncate text-[11px] font-mono text-foreground ml-1"
              title={fullUrl}
            >
              {fullUrl}
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="text-[12px] min-w-48">
          <ContextMenuItem onClick={() => handleCopy(fullUrl)}>
            Copy URL
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleCopy(session.path)}>
            Copy Path
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleCopy(session.method)}>
            Copy Method
          </ContextMenuItem>
          {session.status > 0 && (
            <ContextMenuItem
              onClick={() => handleCopy(session.status.toString())}
            >
              Copy Status Code
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => exportToPostman(session)}>
            Open in Postman
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="flex items-center gap-2 px-2 h-7 border-b border-border bg-panel-header shrink-0 select-none">
            <span className="text-[11px] font-semibold text-foreground mr-1">
              Request
            </span>
            <TabButton
              label="Header"
              active={reqTab === "Header"}
              onClick={() => setReqTab("Header")}
            />
            {hasQuery && (
              <TabButton
                label="Query"
                active={reqTab === "Query"}
                onClick={() => setReqTab("Query")}
              />
            )}
            {hasReqBody && (
              <TabButton
                label="Body"
                active={reqTab === "Body"}
                onClick={() => setReqTab("Body")}
              />
            )}
            {hasReqCookies && (
              <TabButton
                label="Cookies"
                active={reqTab === "Cookies"}
                onClick={() => setReqTab("Cookies")}
              />
            )}

            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-2 h-full text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center outline-none">
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-[12px] min-w-32">
                <DropdownMenuItem
                  onClick={() => handleCopy(getRawRequest(session))}
                >
                  Copy Raw Request
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportRequest(session)}>
                  Export Request
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToPostman(session)}>
                  Open in Postman
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {reqTab === "Header" && (
              <HeadersTable headers={session.requestHeaders} />
            )}
            {reqTab === "Cookies" && (
              <div className="w-full">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-panel-header text-[11px] text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="font-normal px-2 py-1 w-1/3 border-r border-border">
                        Name
                      </th>
                      <th className="font-normal px-2 py-1">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestCookies.map(([key, val], i) => (
                      <tr
                        key={`${key}-${i}`}
                        className="border-b border-border/50 text-[11px]"
                      >
                        <td className="px-2 py-1 border-r border-border/50 font-mono text-foreground">
                          {key}
                        </td>
                        <td className="px-2 py-1 font-mono text-foreground break-all">
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {reqTab === "Query" && (
              <div className="w-full">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-panel-header text-[11px] text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="font-normal px-2 py-1 w-1/3 border-r border-border">
                        Key
                      </th>
                      <th className="font-normal px-2 py-1">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryParams.map(([key, val], i) => (
                      <tr
                        key={`${key}-${i}`}
                        className="border-b border-border/50 text-[11px]"
                      >
                        <td className="px-2 py-1 border-r border-border/50 font-mono text-foreground">
                          {key}
                        </td>
                        <td className="px-2 py-1 font-mono text-foreground break-all">
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {reqTab === "Body" && session.requestBody && (
              <BodyViewer
                body={session.requestBody}
                isJson={isJson}
                contentType={session.contentType || ""}
              />
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 px-2 h-7 border-b border-border bg-panel-header shrink-0 select-none">
            <span className="text-[11px] font-semibold text-foreground mr-1">
              Response
            </span>
            <TabButton
              label="Header"
              active={resTab === "Header"}
              onClick={() => setResTab("Header")}
            />
            {hasResBody && (
              <TabButton
                label="Body"
                active={resTab === "Body"}
                onClick={() => setResTab("Body")}
              />
            )}
            {hasResCookies && (
              <TabButton
                label="Cookies"
                active={resTab === "Cookies"}
                onClick={() => setResTab("Cookies")}
              />
            )}
            {isWs && (
              <TabButton
                label="Messages"
                active={resTab === "Messages"}
                onClick={() => setResTab("Messages")}
              />
            )}

            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-2 h-full text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center outline-none">
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-[12px] min-w-32">
                <DropdownMenuItem
                  onClick={() => handleCopy(getRawResponse(session))}
                >
                  Copy Raw Response
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportResponse(session)}>
                  Export Response
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {resTab === "Header" && (
              <HeadersTable headers={session.responseHeaders} />
            )}
            {resTab === "Cookies" && (
              <div className="w-full">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-panel-header text-[11px] text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="font-normal px-2 py-1 w-1/3 border-r border-border">
                        Name
                      </th>
                      <th className="font-normal px-2 py-1">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responseCookies.map(([key, val], i) => (
                      <tr
                        key={`${key}-${i}`}
                        className="border-b border-border/50 text-[11px]"
                      >
                        <td className="px-2 py-1 border-r border-border/50 font-mono text-foreground">
                          {key}
                        </td>
                        <td className="px-2 py-1 font-mono text-foreground break-all">
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {resTab === "Body" && session.responseBody && (
              <BodyViewer
                body={session.responseBody}
                isJson={isJson}
                contentType={session.contentType || ""}
              />
            )}
            {resTab === "Messages" && <MessagesTab messages={wsMessages} />}

            {!session.complete && (
              <div className="p-4 text-[11px] text-muted-foreground flex items-center gap-1">
                <Spinner size={14} />
                <span>Waiting for response...</span>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
