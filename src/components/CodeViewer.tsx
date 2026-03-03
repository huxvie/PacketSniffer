// also mostly vibecoded

import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { xml } from "@codemirror/lang-xml";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { useTheme } from "@/hooks/useTheme";

interface CodeViewerProps {
  content: string;
  contentType: string;
}

const baseTheme = {
  "&": {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    backgroundColor: "transparent",
  },
  ".cm-content": {
    padding: "8px 0",
  },
  ".cm-line": {
    padding: "0 8px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--panel-header)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
    paddingRight: "4px",
  },
  ".cm-gutterElement": {
    padding: "0 8px 0 4px !important",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--muted)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    padding: "0 4px",
    borderRadius: "2px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "var(--primary) !important",
      color: "var(--primary-foreground) !important",
    },
};

const lightTheme = EditorView.theme(
  {
    ...baseTheme,
    "&": { ...baseTheme["&"], color: "#111", backgroundColor: "transparent" },
    ".cm-content": { caretColor: "#111", ...baseTheme[".cm-content"] },
  },
  { dark: false },
);

const darkTheme = EditorView.theme(
  {
    ...baseTheme,
    "&": { ...baseTheme["&"], color: "#eee", backgroundColor: "transparent" },
    ".cm-content": { caretColor: "#eee", ...baseTheme[".cm-content"] },
  },
  { dark: true },
);

const lightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#111", fontWeight: "bold" },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: "#111",
  },
  {
    tag: [t.function(t.variableName), t.labelName],
    color: "#111",
    fontWeight: "bold",
  },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#111" },
  { tag: [t.definition(t.name), t.separator], color: "#111" },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace,
    ],
    color: "#111",
  },
  {
    tag: [
      t.operator,
      t.operatorKeyword,
      t.url,
      t.escape,
      t.regexp,
      t.link,
      t.special(t.string),
    ],
    color: "#666",
  },
  { tag: [t.meta, t.comment], color: "#666", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#666", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#111" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#111" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#666" },
  { tag: t.invalid, color: "red" },
]);

const darkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#eee", fontWeight: "bold" },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: "#eee",
  },
  {
    tag: [t.function(t.variableName), t.labelName],
    color: "#eee",
    fontWeight: "bold",
  },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#eee" },
  { tag: [t.definition(t.name), t.separator], color: "#eee" },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace,
    ],
    color: "#eee",
  },
  {
    tag: [
      t.operator,
      t.operatorKeyword,
      t.url,
      t.escape,
      t.regexp,
      t.link,
      t.special(t.string),
    ],
    color: "#999",
  },
  { tag: [t.meta, t.comment], color: "#999", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#999", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#eee" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#eee" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#999" },
  { tag: t.invalid, color: "red" },
]);

export default function CodeViewer({ content, contentType }: CodeViewerProps) {
  const { isDark } = useTheme();

  let formattedContent = content;
  let isJson = false;

  if (
    contentType.includes("json") ||
    content.trim().startsWith("{") ||
    content.trim().startsWith("[")
  ) {
    try {
      const parsed = JSON.parse(content);
      formattedContent = JSON.stringify(parsed, null, 2);
      isJson = true;
    } catch {
      // ignore
    }
  }

  const extensions = [
    EditorView.lineWrapping,
    isDark ? darkTheme : lightTheme,
    syntaxHighlighting(isDark ? darkHighlight : lightHighlight),
  ];

  if (isJson || contentType.includes("json")) {
    extensions.push(json());
  } else if (contentType.includes("html")) {
    extensions.push(html());
  } else if (contentType.includes("xml")) {
    extensions.push(xml());
  } else if (
    contentType.includes("javascript") ||
    contentType.includes("text/javascript")
  ) {
    extensions.push(javascript());
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="flex items-center justify-end px-2 py-1.5 border-b border-border bg-panel-header gap-2 shrink-0">
        <button
          onClick={() => navigator.clipboard.writeText(formattedContent)}
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-transparent hover:border-border hover:bg-muted transition-colors"
        >
          Copy Body
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <CodeMirror
          value={formattedContent}
          height="100%"
          extensions={extensions}
          readOnly={true}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: false,
            searchKeymap: false,
            autocompletion: false,
          }}
          className="h-full [&>.cm-editor]:h-full [&>.cm-editor]:outline-none [&_.cm-scroller]:bg-background"
        />
      </div>
    </div>
  );
}
