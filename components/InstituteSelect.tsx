"use client"

import { useMemo, useState } from "react"
import { useInstitutes } from "@/components/admin/InstitutePicker"
import { matchInstitute } from "@/lib/institutes"

export interface InstituteValue {
  instituteId: string // "" when typed manually
  institute: string // institute name (selected or typed)
}

const inputCls = "w-full px-3 py-2 text-sm border border-input rounded-md bg-background"

/**
 * Candidate-side institute field. Uses the same institute list admins pick from when setting a
 * job's preferred institutes, so selections match exactly. "Other" allows typing an unlisted name.
 * For school/college levels pass `freeText` to show a plain text field instead.
 */
export function InstituteSelect({
  value,
  onChange,
  freeText = false,
  placeholder = "Search your institute...",
}: {
  value: InstituteValue
  onChange: (v: InstituteValue) => void
  freeText?: boolean
  placeholder?: string
}) {
  const institutes = useInstitutes()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [other, setOther] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return institutes.filter((i) => !q || i.name.toLowerCase().includes(q)).slice(0, 8)
  }, [institutes, query])

  if (freeText) {
    return (
      <input
        className={inputCls}
        placeholder="School / College name"
        value={value.institute}
        onChange={(e) => onChange({ instituteId: "", institute: e.target.value })}
      />
    )
  }

  if (value.instituteId) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm border border-input rounded-md bg-background">
        <span className="font-medium">{value.institute}</span>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => {
            onChange({ instituteId: "", institute: "" })
            setQuery("")
            setOther(false)
          }}
        >
          Change
        </button>
      </div>
    )
  }

  if (other || (value.institute && !open)) {
    return (
      <div className="space-y-1.5">
        <input
          className={inputCls}
          placeholder="Type your institute name"
          value={value.institute}
          onChange={(e) => {
            const text = e.target.value
            // If the typed name is actually a known institute (or alias), link it
            const refs = institutes.map((i) => ({ id: i.id, name: i.name }))
            const matched = matchInstitute(text, refs)
            onChange(matched ? { instituteId: matched, institute: refs.find((r) => r.id === matched)!.name } : { instituteId: "", institute: text })
          }}
        />
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => {
            setOther(false)
            onChange({ instituteId: "", institute: "" })
          }}
        >
          Choose from list instead
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        className={inputCls}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border border-border bg-popover shadow-md text-sm">
          {matches.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ instituteId: i.id, institute: i.name })
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-muted"
              >
                {i.name}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOther(true)
                onChange({ instituteId: "", institute: query })
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-primary hover:bg-muted border-t border-border"
            >
              Other (not listed){query ? `: "${query}"` : ""}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
