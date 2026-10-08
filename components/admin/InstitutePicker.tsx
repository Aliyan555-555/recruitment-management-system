"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"

export interface InstituteOption {
  id: string
  name: string
}

let cache: InstituteOption[] | null = null

export function useInstitutes() {
  const [institutes, setInstitutes] = useState<InstituteOption[]>(cache ?? [])
  useEffect(() => {
    if (cache) return
    fetch("/api/institutes")
      .then((r) => (r.ok ? r.json() : { institutes: [] }))
      .then((d) => {
        cache = d.institutes ?? []
        setInstitutes(cache!)
      })
      .catch(() => {})
  }, [])
  return institutes
}

/** Searchable multi-select with removable chips. Value is a list of institute ids. */
export function InstitutePicker({
  value,
  onChange,
  placeholder = "Search institute (e.g. NED, Karachi)...",
}: {
  value: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
}) {
  const institutes = useInstitutes()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const byId = useMemo(() => new Map(institutes.map((i) => [i.id, i.name])), [institutes])
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return institutes
      .filter((i) => !value.includes(i.id) && (!q || i.name.toLowerCase().includes(q)))
      .slice(0, 8)
  }, [institutes, query, value])

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full pl-2.5 pr-1 py-0.5"
            >
              {byId.get(id) ?? `Institute #${id}`}
              <button
                type="button"
                aria-label="Remove institute"
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="rounded-full hover:bg-primary/20 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
        />
        {open && matches.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-border bg-popover shadow-md text-sm">
            {matches.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange([...value, i.id])
                    setQuery("")
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted"
                >
                  {i.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
