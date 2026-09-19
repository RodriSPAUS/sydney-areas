import { Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { suburbs } from "@/data/suburbs";
import { useMapStore } from "@/lib/map-store";
import { cn } from "@/lib/utils";

export function SuburbSearch() {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selectSuburb = useMapStore((s) => s.selectSuburb);
  const selectedId = useMapStore((s) => s.selectedId);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return suburbs.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 12);
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function choose(id: string) {
    selectSuburb(id);
    const name = suburbs.find((s) => s.id === id)?.name ?? "";
    setQuery(name);
    setOpen(false);
    inputRef.current?.blur();
  }

  useEffect(() => {
    if (!selectedId) return;
    const name = suburbs.find((s) => s.id === selectedId)?.name;
    if (name && query !== name) setQuery(name);
    // Only sync when the map selection changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="relative">
      <label htmlFor="suburb-search" className="sr-only">
        Search suburbs
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        strokeWidth={2}
        aria-hidden
      />
      <input
        ref={inputRef}
        id="suburb-search"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Search suburbs"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            const hit = matches[active];
            if (hit) {
              e.preventDefault();
              choose(hit.id);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        className={cn(
          "h-11 w-full rounded-xl bg-surface pr-10 pl-10 text-sm text-fg",
          "shadow-[var(--shadow-border)] outline-none",
          "placeholder:text-subtle",
          "transition-[box-shadow] duration-150 ease-out",
          "focus:shadow-[var(--shadow-border-hover)] focus:ring-2 focus:ring-primary/30",
        )}
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-fg"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery("");
            setOpen(false);
            selectSuburb(null);
            inputRef.current?.focus();
          }}
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      ) : null}

      {open && query.trim() ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-30 max-h-64 overflow-auto rounded-xl bg-surface py-1 shadow-[var(--shadow-border)]"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">No suburbs match</li>
          ) : (
            matches.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={cn(
                    "flex h-11 w-full items-center px-3 text-left text-sm",
                    i === active ? "bg-bg text-fg" : "text-fg hover:bg-bg",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(s.id)}
                >
                  {s.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
