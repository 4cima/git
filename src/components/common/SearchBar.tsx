'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDebounce } from '../../hooks/useDebounce'
import { Input, InputSize } from './Input'
import { Mic, Loader2, Search } from 'lucide-react'
import { useLang } from '../../state/useLang'

type SearchBarProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  placeholder?: string
  className?: string
  size?: InputSize
  onQueryChange?: (value: string) => void
  onSearch?: () => void
}

export const SearchBar = ({ placeholder, className, size = 'md', onQueryChange, onSearch, ...props }: SearchBarProps) => {
  const [q, setQ] = useState('')
  const [isListening, setIsListening] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const debounced = useDebounce(q, 400)
  const { lang } = useLang()

  useEffect(() => {
    // Only trigger parent update, do NOT auto-navigate
    if (debounced.trim().length > 1) {
      onQueryChange?.(debounced.trim())
    }
  }, [debounced, onQueryChange])

  const handleSearch = () => {
    if (q.trim().length > 0) {
      onQueryChange?.(q.trim())
      onSearch?.()
      const url = `/search?q=${encodeURIComponent(q.trim())}`
      router.push(url)
    }
  }

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setQ(text);
        // User must press search button manually
      };

      recognition.start();
    } else {
      alert('Voice search is not supported in this browser.');
    }
  }

  return (
    <div className={`relative w-full ${className || ''}`}>
      <Input
        id="searchbar-input"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder={isListening ? (lang === 'ar' ? 'تحدث الآن...' : 'Listening...') : (placeholder || 'ابحث عن فيلم...')}
        size={size}
        // Increase padding significantly to push text away from left icons
        // Increase border opacity and bg opacity to make input more visible
        className="w-full bg-black/60 border-white/20 hover:border-white/40 focus:border-primary/60 transition-colors pl-28 rtl:pl-28 rtl:pr-4"
        {...props}
      />

      {/* Position icons on the far LEFT (in RTL) or RIGHT (in LTR) */}
      <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${lang === 'ar' ? 'left-2' : 'right-2'}`}>
        <button
          type="button"
          onClick={startListening}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-white/10 hover:text-primary active:scale-95"
          aria-label="Voice Search"
        >
          {isListening ? <Loader2 className="animate-spin text-primary" size={18} /> : <Mic size={18} />}
        </button>

        <button
          type="button"
          onClick={handleSearch}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/20 text-zinc-300 transition-all hover:bg-primary/40 hover:text-white active:scale-95"
          aria-label="Search"
        >
          <Search size={16} />
        </button>
      </div>
    </div>
  )
}
