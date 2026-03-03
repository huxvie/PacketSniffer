import { cn } from "@/lib/utils";

export type ContentFilter =
  | "All"
  | "HTTP"
  | "HTTPS"
  | "WebSocket"
  | "JSON"
  | "Form"
  | "XML"
  | "JS"
  | "CSS"
  | "GraphQL"
  | "Document"
  | "Media"
  | "Other";

const FILTERS: (ContentFilter | "|")[] = [
  "All",
  "HTTP",
  "HTTPS",
  "WebSocket",
  "|",
  "JSON",
  "Form",
  "XML",
  "JS",
  "CSS",
  "GraphQL",
  "Document",
  "Media",
  "Other",
];

interface ContentFilterBarProps {
  activeFilter: ContentFilter;
  onFilterChange: (filter: ContentFilter) => void;
}

export default function ContentFilterBar({
  activeFilter,
  onFilterChange,
}: ContentFilterBarProps) {
  return (
    <div className="flex items-center h-7 px-2 gap-0.5 bg-background border-b border-border shrink-0 overflow-x-auto scrollbar-hide">
      {FILTERS.map((filter, index) => {
        if (filter === "|") {
          return (
            <div key={`sep-${index}`} className="w-px h-3.5 bg-border mx-1" />
          );
        }

        const isSelected = activeFilter === filter;

        return (
          <button
            key={filter}
            onClick={() => onFilterChange(filter as ContentFilter)}
            className={cn(
              "px-2.5 py-0.75 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap",
              isSelected
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
