'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type Props = {
  name: string
  category: { name: string; slug: string }
  description?: string
  productCollection?: string
}

const PLACEHOLDER_FEATURES = [
  'Premium quality fabric',
  'Relaxed contemporary fit',
  'Locally crafted in Nepal',
  'Sustainable materials',
  'Season-ready design',
]

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

export default function ProductInfo({ name, category, productCollection }: Props) {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const duration = (value: number) => (reduced ? 0 : value)

  return (
    <div className={cn('flex h-full flex-col')}>
      {/* Breadcrumb / category label */}
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 12 }}
        animate={mounted ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: duration(0.5), delay: 0, ease: EASE }}
        style={{ marginBottom: 16 }}
      >
        <Link
          href={`/shop?category=${category.slug}`}
          className={cn('inline-flex font-sans')}
          style={{
            fontSize: 12,
            letterSpacing: '0.16em',
            color: 'var(--rych-smoke)',
            textTransform: 'uppercase',
          }}
        >
          {category.name}
        </Link>
      </motion.div>

      {/* Product name */}
      <div className={cn('overflow-hidden')} style={{ marginBottom: 28 }}>
        <motion.h1
          className={cn('font-display')}
          initial={
            reduced
              ? { opacity: 0, y: 0 }
              : { clipPath: 'inset(100% 0% 0% 0%)', opacity: 1 }
          }
          animate={
            mounted
              ? reduced
                ? { opacity: 1, y: 0 }
                : { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }
              : undefined
          }
          transition={{ duration: duration(0.7), delay: 0.1, ease: EASE }}
          style={{
            fontSize: 'clamp(30px, 3vw, 44px)',
            fontWeight: 300,
            letterSpacing: '-0.01em',
            color: 'var(--rych-parchment)',
            lineHeight: 1.15,
          }}
        >
          {name}
        </motion.h1>
      </div>

      {/* Divider — existing scaleX animation */}
      <motion.div
        initial={{ opacity: 0, scaleX: reduced ? 1 : 0 }}
        animate={mounted ? { opacity: 1, scaleX: 1 } : undefined}
        transition={{ duration: duration(0.5), delay: 0.3, ease: EASE }}
        style={{
          width: 40,
          height: 1,
          marginBottom: 20,
          transformOrigin: 'left',
          backgroundColor: 'var(--rych-border2)',
        }}
      />

      {/* Feature bullets */}
      <div className={cn('flex flex-col')} style={{ gap: 8 }}>
        {PLACEHOLDER_FEATURES.map((feature, index) => (
          <motion.div
            key={feature}
            className={cn('flex items-center')}
            initial={{ opacity: 0, x: reduced ? 0 : -8 }}
            animate={mounted ? { opacity: 1, x: 0 } : undefined}
            transition={{
              duration: duration(0.45),
              delay: reduced ? 0 : 0.4 + index * 0.06,
              ease: EASE,
            }}
            style={{ gap: 10 }}
          >
            <span style={{ color: 'var(--rych-smoke)', flexShrink: 0 }}>—</span>
            <span
              className="font-sans"
              style={{
                fontSize: 14,
                letterSpacing: '0.03em',
                color: 'var(--rych-ash)',
                lineHeight: 1.7,
              }}
            >
              {feature}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Season / collection note — pushed to bottom via margin-top auto */}
      <motion.p
        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
        animate={mounted ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: duration(0.4), delay: 0.58, ease: EASE }}
        className="font-sans"
        style={{
          fontSize: 12,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--rych-smoke)',
          marginTop: 'auto',
        }}
      >
        {productCollection ?? ''}
      </motion.p>
    </div>
  )
}
