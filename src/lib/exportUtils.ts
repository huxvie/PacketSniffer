import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { HttpSession } from "@/types";

export function parseQueryParams(path: string): [string, string][] {
  const qIdx = path.indexOf("?");
  if (qIdx === -1) return [];
  try {
    const params = new URLSearchParams(path.slice(qIdx + 1));
    return [...params.entries()];
  } catch {
    return [];
  }
}

export function getFullUrl(session: HttpSession): string {
  return session.url.startsWith("http") || session.url.startsWith("ws")
    ? session.url
    : `${session.scheme}://${session.host}${session.path}`;
}

export async function exportToPostman(session: HttpSession) {
  const queryParams = parseQueryParams(session.path);
  const fullUrl = getFullUrl(session);

  const postmanItem = {
    name: session.path,
    request: {
      method: session.method,
      header: session.requestHeaders.map((h) => ({ key: h.name, value: h.value })),
      url: {
        raw: fullUrl,
        host: [session.host],
        path: session.path.split("?")[0].split("/").filter(Boolean),
        query: queryParams.map(([k, v]) => ({ key: k, value: v })),
      },
      body: session.requestBody
        ? {
            mode: "raw",
            raw: session.requestBody,
          }
        : undefined,
    },
  };

  const collection = {
    info: {
      name: `Exported Request: ${session.host}`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [postmanItem],
  };

  try {
    await invoke("open_in_postman", { json: JSON.stringify(collection, null, 2) });
  } catch (e) {
    console.error("Failed to open in Postman", e);
  }
}

export function getRawRequest(session: HttpSession): string {
  const lines = [`${session.method} ${session.path} ${session.httpVersion}`, `Host: ${session.host}`];
  session.requestHeaders.forEach(h => lines.push(`${h.name}: ${h.value}`));
  if (session.requestBody) {
    lines.push("");
    lines.push(session.requestBody);
  }
  return lines.join("\n");
}

export function getRawResponse(session: HttpSession): string {
  const lines = [`${session.httpVersion} ${session.status} ${session.statusText}`];
  session.responseHeaders.forEach(h => lines.push(`${h.name}: ${h.value}`));
  if (session.responseBody) {
    lines.push("");
    lines.push(session.responseBody);
  }
  return lines.join("\n");
}

export async function exportResponse(session: HttpSession) {
  try {
    const path = await save({
      defaultPath: `response_${session.host.replace(/[^a-z0-9]/gi, "_")}.txt`,
      filters: [{ name: "Text", extensions: ["txt"] }, { name: "All Files", extensions: ["*"] }],
    });
    if (path) {
      await writeTextFile(path, getRawResponse(session));
    }
  } catch (e) {
    console.error("Failed to export response", e);
  }
}

export async function exportRequest(session: HttpSession) {
  try {
    const path = await save({
      defaultPath: `request_${session.host.replace(/[^a-z0-9]/gi, "_")}.txt`,
      filters: [{ name: "Text", extensions: ["txt"] }, { name: "All Files", extensions: ["*"] }],
    });
    if (path) {
      await writeTextFile(path, getRawRequest(session));
    }
  } catch (e) {
    console.error("Failed to export request", e);
  }
}
