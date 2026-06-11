import { useState, useEffect, useRef, type KeyboardEvent } from "react"
import { api } from "../../services/api"
import { Search } from "lucide-react"

interface VisitorResult {
  id: string
  name: string
  phone: string | null
  company: string | null
  last_visit_at: string | null
  last_host_name: string | null
  last_tenant_name: string | null
}

interface SearchBarProps {
  onSelectVisitor: (visitor: VisitorResult) => void
  onNewVisitor: () => void
}

export function SearchBar({ onSelectVisitor, onNewVisitor }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<VisitorResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api.get(`/visitors?q=${encodeURIComponent(query)}`)
        setResults(data)
        setIsOpen(data.length > 0)
        setSelectedIndex(-1)
      } catch { setResults([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" && query.trim().length > 0) {
        onNewVisitor()
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault()
      onSelectVisitor(results[selectedIndex])
      setIsOpen(false)
      setQuery("")
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  const resultsId = "search-results"

  return (
    <div ref={containerRef} className="relative w-full" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls={resultsId}>
      <div className="relative">
        <label htmlFor="search-visitor" className="sr-only">Buscar visitante por nombre, teléfono o empresa</label>
        <input
          ref={inputRef}
          id="search-visitor"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nombre, teléfono o empresa..."
          role="searchbox"
          aria-autocomplete="list"
          aria-controls={resultsId}
          aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
          className="w-full h-12 rounded-xl border-2 border-border bg-card pl-12 pr-4 text-base outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
      </div>
      {isOpen && results.length > 0 && (
        <div id={resultsId} role="listbox" aria-label="Resultados de búsqueda"
          className="absolute z-50 mt-1 w-full border border-border rounded-xl bg-card shadow-lg divide-y divide-border overflow-hidden">
          {results.map((v, i) => (
            <button
              key={v.id}
              id={`search-result-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => { onSelectVisitor(v); setIsOpen(false); setQuery("") }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                i === selectedIndex ? "bg-muted" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{v.name}</span>
                {v.last_visit_at ? (
                  <span className="text-xs text-muted-foreground">
                    Última visita: {new Date(v.last_visit_at).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-xs text-secondary">Nuevo</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {v.company && <span>{v.company}</span>}
                {v.last_host_name && <span>→ {v.last_host_name}</span>}
                {v.last_tenant_name && <span>({v.last_tenant_name})</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export type { VisitorResult }
