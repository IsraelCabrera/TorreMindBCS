import { useState, useCallback } from "react"

interface VirtualKeyboardProps {
  onChar: (char: string) => void
  onBackspace: () => void
  onEnter: () => void
  onClear: () => void
  disabled?: boolean
  numeric?: boolean
}

type Mode = "lower" | "upper" | "symbols"

const KEYS: Record<Mode, { rows: string[][] }> = {
  lower: {
    rows: [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ñ"],
      ["z", "x", "c", "v", "b", "n", "m"],
    ],
  },
  upper: {
    rows: [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
      ["Z", "X", "C", "V", "B", "N", "M"],
    ],
  },
  symbols: {
    rows: [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["-", "/", ":", ";", "(", ")", "$", "&", "@", '"'],
      [".", ",", "?", "!", "'", "¿", "¡", "*", "+", "="],
    ],
  },
}

const ACCENTS_LOWER = ["á", "é", "í", "ó", "ú", "ü"]
const ACCENTS_UPPER = ["Á", "É", "Í", "Ó", "Ú", "Ü"]

function KbdKey({
  label,
  onPress,
  wide,
  variant,
  disabled,
}: {
  label: string
  onPress: () => void
  wide?: boolean
  variant?: "default" | "modifier" | "accent"
  disabled?: boolean
}) {
  const color =
    variant === "modifier"
      ? "bg-white/20 text-white active:bg-white/35"
      : variant === "accent"
        ? "bg-secondary/30 text-white active:bg-secondary/60"
        : "bg-white/15 text-white hover:bg-white/20 active:bg-white/30"

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      disabled={disabled}
      className={`flex items-center justify-center rounded-xl text-lg font-semibold
        select-none touch-manipulation transition-colors min-h-12
        disabled:opacity-30
        ${wide ? "flex-[2_2_0%] min-w-0" : "flex-1 min-w-0"}
        ${color}`}
      aria-label={label}
    >
      {label}
    </button>
  )
}

export function VirtualKeyboard({
  onChar,
  onBackspace,
  onEnter,
  onClear,
  disabled,
  numeric,
}: VirtualKeyboardProps) {
  const [mode, setMode] = useState<Mode>("lower")

  const handleKey = useCallback(
    (char: string) => {
      if (disabled) return
      onChar(char)
      if (mode === "upper" && /[A-ZÁÉÍÓÚÜÑ]/.test(char)) {
        setMode("lower")
      }
    },
    [onChar, mode, disabled],
  )

  const toggleMode = useCallback(() => {
    setMode((m) => {
      if (m === "lower") return "upper"
      if (m === "upper") return "lower"
      return "lower"
    })
  }, [])

  const toggleSymbols = useCallback(() => {
    setMode((m) => (m === "symbols" ? "lower" : "symbols"))
  }, [])

  if (numeric) {
    return (
      <div className="w-full bg-[#1a1a2e] px-2 pt-2 pb-3 space-y-1 select-none shadow-2xl">
        <div className="flex gap-1">
          <KbdKey label="1" onPress={() => onChar("1")} disabled={disabled} />
          <KbdKey label="2" onPress={() => onChar("2")} disabled={disabled} />
          <KbdKey label="3" onPress={() => onChar("3")} disabled={disabled} />
        </div>
        <div className="flex gap-1">
          <KbdKey label="4" onPress={() => onChar("4")} disabled={disabled} />
          <KbdKey label="5" onPress={() => onChar("5")} disabled={disabled} />
          <KbdKey label="6" onPress={() => onChar("6")} disabled={disabled} />
        </div>
        <div className="flex gap-1">
          <KbdKey label="7" onPress={() => onChar("7")} disabled={disabled} />
          <KbdKey label="8" onPress={() => onChar("8")} disabled={disabled} />
          <KbdKey label="9" onPress={() => onChar("9")} disabled={disabled} />
          <KbdKey label="⌫" onPress={onBackspace} variant="modifier" disabled={disabled} />
        </div>
        <div className="flex gap-1">
          <KbdKey label="+" onPress={() => onChar("+")} variant="modifier" disabled={disabled} />
          <KbdKey label="0" onPress={() => onChar("0")} disabled={disabled} />
          <KbdKey label="-" onPress={() => onChar("-")} variant="modifier" disabled={disabled} />
          <KbdKey label="Espacio" onPress={() => onChar(" ")} variant="modifier" wide disabled={disabled} />
          <KbdKey label="⏎" onPress={onEnter} variant="modifier" disabled={disabled} />
        </div>
        <div className="flex gap-1 justify-center">
          <KbdKey label="Borrar" onPress={onClear} variant="modifier" disabled={disabled} />
        </div>
      </div>
    )
  }

  const isLetterMode = mode !== "symbols"
  const accents = mode === "upper" ? ACCENTS_UPPER : ACCENTS_LOWER
  const { rows } = KEYS[mode]

  return (
    <div className="w-full bg-[#1a1a2e] px-2 pt-2 pb-3 space-y-1 select-none shadow-2xl">
      {isLetterMode && (
        <div className="flex justify-center gap-1">
          {accents.map((ch) => (
            <KbdKey key={ch} label={ch} onPress={() => handleKey(ch)} variant="accent" disabled={disabled} />
          ))}
        </div>
      )}

      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1">
          {ri === 2 && isLetterMode && (
            <KbdKey label={mode === "upper" ? "⇧" : "⇧"} onPress={toggleMode} variant="modifier" disabled={disabled} />
          )}
          {row.map((ch) => (
            <KbdKey key={ch} label={ch} onPress={() => handleKey(ch)} disabled={disabled} />
          ))}
          {ri === 2 && (
            <KbdKey label="⌫" onPress={onBackspace} variant="modifier" disabled={disabled} />
          )}
        </div>
      ))}

      <div className="flex gap-1">
        <KbdKey label={mode === "symbols" ? "ABC" : "123"} onPress={toggleSymbols} variant="modifier" disabled={disabled} />
        <KbdKey label="," onPress={() => onChar(",")} variant="modifier" disabled={disabled} />
        <KbdKey label="Espacio" onPress={() => onChar(" ")} variant="modifier" wide disabled={disabled} />
        <KbdKey label="." onPress={() => onChar(".")} variant="modifier" disabled={disabled} />
        <KbdKey label="Borrar" onPress={onClear} variant="modifier" disabled={disabled} />
        <KbdKey label="⏎" onPress={onEnter} variant="modifier" disabled={disabled} />
      </div>
    </div>
  )
}
