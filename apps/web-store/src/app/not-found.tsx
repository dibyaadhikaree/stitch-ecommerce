'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function NotFound() {
  const reduced = useReducedMotion();
  const dur = (base: number) => (reduced ? 0 : base);
  const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--rych-bg)' }}
    >
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: dur(0.6), ease }}
          style={{
            fontFamily: 'var(--rych-font-display)',
            fontWeight: 300,
            fontSize: 'clamp(80px, 15vw, 140px)',
            color: 'var(--rych-border2)',
            lineHeight: 1,
          }}
        >
          404
        </motion.div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur(0.4), delay: dur(0.15), ease }}
        >
          <p
            style={{
              fontFamily: 'var(--rych-font-sans)',
              fontSize: '13px',
              color: 'var(--rych-ash)',
              letterSpacing: '0.04em',
              marginTop: '16px',
              marginBottom: '32px',
            }}
          >
            This page doesn&apos;t exist.
          </p>

          <div style={{ display: 'flex', gap: '32px' }}>
            <Link
              href="/shop"
              style={{
                fontFamily: 'var(--rych-font-sans)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--rych-ash)',
                textDecoration: 'none',
                transition: 'color 200ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rych-parchment)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--rych-ash)'; }}
            >
              BACK TO SHOP
            </Link>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--rych-font-sans)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--rych-ash)',
                textDecoration: 'none',
                transition: 'color 200ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rych-parchment)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--rych-ash)'; }}
            >
              HOME
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
