'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { formatNPR } from '@/lib/utils'

export default function CartDrawer() {
  const isOpen    = useCartStore(s => s.isOpen)
  const closeCart = useCartStore(s => s.closeCart)
  const items     = useCartStore(s => s.items)
  const updateQty = useCartStore(s => s.updateQty)
  const total     = useCartStore(s =>
    s.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={closeCart}
          />

          {/* Drawer panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              background:  'var(--rych-surface)',
              borderLeft:  '0.5px solid var(--rych-border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 shrink-0"
              style={{ borderBottom: '0.5px solid var(--rych-border)' }}
            >
              <span
                style={{
                  fontSize:      11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color:         'var(--rych-parchment)',
                }}
              >
                YOUR CART{' '}
                <span style={{ color: 'var(--rych-ash)' }}>({items.length})</span>
              </span>
              <button
                onClick={closeCart}
                aria-label="Close cart"
                className="text-ash hover:text-parchment transition-colors duration-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                  <p
                    style={{
                      fontSize:      11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color:         'var(--rych-smoke)',
                    }}
                  >
                    Your cart is empty
                  </p>
                  <Link
                    href="/shop"
                    onClick={closeCart}
                    className="text-ash hover:text-parchment transition-colors duration-200"
                    style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    SHOP NOW →
                  </Link>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={item.variantId}
                    className="flex items-center gap-3 px-6"
                    style={{
                      height:       72,
                      borderBottom: idx < items.length - 1
                        ? '0.5px solid var(--rych-border)'
                        : 'none',
                    }}
                  >
                    {/* Product image */}
                    <div
                      className="shrink-0 overflow-hidden"
                      style={{ width: 48, height: 60, background: 'var(--rych-lift)' }}
                    >
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Name + size */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--rych-parchment)' }}
                      >
                        {item.name}
                      </p>
                      <p
                        style={{
                          fontSize:      10,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color:         'var(--rych-smoke)',
                          marginTop:     2,
                        }}
                      >
                        {item.size}
                      </p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateQty(item.variantId, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="w-5 h-5 flex items-center justify-center text-ash hover:text-parchment transition-colors duration-200"
                      >
                        <Minus size={10} />
                      </button>
                      <span
                        style={{
                          fontSize:   11,
                          color:      'var(--rych-parchment)',
                          minWidth:   14,
                          textAlign:  'center',
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.variantId, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="w-5 h-5 flex items-center justify-center text-ash hover:text-parchment transition-colors duration-200"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {/* Line price */}
                    <span
                      className="shrink-0 text-right"
                      style={{
                        fontSize:      11,
                        letterSpacing: '0.04em',
                        color:         'var(--rych-parchment)',
                        minWidth:      68,
                      }}
                    >
                      {formatNPR(item.price * item.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div
                className="px-6 py-5 shrink-0"
                style={{ borderTop: '0.5px solid var(--rych-border)' }}
              >
                <div className="flex items-center justify-between mb-5">
                  <span
                    style={{
                      fontSize:      11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color:         'var(--rych-ash)',
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{ fontSize: 14, letterSpacing: '0.06em', color: 'var(--rych-parchment)' }}
                  >
                    {formatNPR(total)}
                  </span>
                </div>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="block w-full text-center py-4 hover:opacity-80 transition-opacity duration-200"
                  style={{
                    background:    'var(--rych-linen)',
                    color:         'var(--rych-bg)',
                    fontSize:      12,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontFamily:    'var(--rych-font-sans)',
                    fontWeight:    500,
                  }}
                >
                  PROCEED TO CHECKOUT
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
