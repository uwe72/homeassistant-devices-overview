interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Suchen (mehrere Begriffe mit Leerzeichen = UND)'}
        className="w-full px-4 py-2 pr-10 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] placeholder-[#4a4a4a] focus:outline-none focus:border-[#00A5CB]"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4a4a] hover:text-[#9a9a9a] text-lg leading-none"
          aria-label="Suche löschen"
        >
          ×
        </button>
      )}
    </div>
  )
}
