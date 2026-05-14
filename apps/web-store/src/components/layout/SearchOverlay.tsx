'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getProducts } from '@/lib/api'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatNPR } from '@/lib/utils'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function SearchOverlay({ isOpen, onClose }: Props) {
  const reduced = useReducedMotion()
  const dur = (base: number) => (reduced ? 0 : base)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    } else {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedQuery(val), 350)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => getProducts({ search: debouncedQuery }),
    enabled: debouncedQuery.trim().length >= 2,
  })

  const results = (data?.products ?? []).slice(0, 8)
  const showResults = debouncedQuery.trim().length >= 2

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: dur(0.25), ease: [0.25, 0.1, 0.25, 1] } }}
          exit={{ opacity: 0, transition: { duration: dur(0.2), ease: [0.25, 0.1, 0.25, 1] } }}
          className="fixed inset-0 z-[70] flex flex-col px-6 md:px-10"
          style={{ background: 'rgba(17,17,17,0.97)' }}
        >
          {/* Header */}
          <div
            className="h-[60px] flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: '0.5px solid var(--rych-border)' }}
          >
            <span
              className="font-display"
              style={{
                fontSize:      11,
                textTransform: 'uppercase',
                color:         'var(--rych-ash)',
                letterSpacing: '0.16em',
              }}
            >
              SEARCH
            </span>
            <button
              onClick={onClose}
              aria-label="Close search"
              style={{
                fontSize:   24,
                color:      'var(--rych-parchment)',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                padding:    0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Input */}
          <div
            className="mt-8 flex-shrink-0"
            style={{ borderBottom: '0.5px solid var(--rych-border2)' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Search products…"
              className="w-full bg-transparent border-none outline-none font-display placeholder:text-smoke"
              style={{
                fontSize:      'clamp(24px, 4vw, 40px)',
                fontWeight:    300,
                color:         'var(--rych-parchment)',
                paddingBottom: 12,
              }}
            />
          </div>

          {/* Results */}
          <div className="mt-6 overflow-y-auto flex-1">
            {showResults && isLoading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-surface animate-pulse" />
                ))}
              </div>
            )}

            {showResults && !isLoading && results.length === 0 && (
              <p
                className="text-center"
                style={{ fontSize: 13, color: 'var(--rych-ash)' }}
              >
                No products found for &ldquo;{debouncedQuery}&rdquo;
              </p>
            )}

            {showResults && !isLoading && results.length > 0 && (
              <motion.div key={debouncedQuery} initial="hidden" animate="visible" className="flex flex-col">
                {results.map((product, i) => {
                  const primaryMedia = product.media.find(m => m.isPrimary) ?? product.media[0]
                  return (
                    <motion.div
                      key={product._id}
                      custom={i}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        visible: (idx: number) => ({
                          opacity: 1,
                          y: 0,
                          transition: {
                            duration: dur(0.2),
                            delay:    reduced ? 0 : idx * 0.03,
                            ease:     [0.25, 0.1, 0.25, 1],
                          },
                        }),
                      }}
                    >
                      <Link
                        href={`/shop/${product.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-4 py-3 hover:bg-surface transition-colors duration-200"
                        style={{ borderBottom: '0.5px solid var(--rych-border)' }}
                      >
                        <div
                          className="flex-shrink-0 bg-lift overflow-hidden"
                          style={{ width: 48, height: 48 }}
                        >
                          {primaryMedia ? (
                            <img
                              src={primaryMedia.url}
                              alt={product.name}
                              style={{ width: 48, height: 48, objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: 48, height: 48 }} />
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span
                            className="font-sans truncate"
                            style={{ fontSize: 13, color: 'var(--rych-parchment)' }}
                          >
                            {product.name}
                          </span>
                          <span
                            className="font-sans"
                            style={{ fontSize: 12, color: 'var(--rych-ash)' }}
                          >
                            {formatNPR(product.sellingPrice)}
                          </span>
                          <span
                            className="font-sans"
                            style={{
                              fontSize:      10,
                              color:         'var(--rych-smoke)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}
                          >
                            {product.category.name}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
