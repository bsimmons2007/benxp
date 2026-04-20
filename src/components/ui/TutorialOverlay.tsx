import { useEffect, useState, useCallback, useRef } from 'react'
import { TUTORIAL_STEPS, markTutorialDone } from '../../lib/tutorial'
import type { TutorialStep } from '../../lib/tutorial'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface TooltipPos {
  top: number | 'auto'
  left: number | 'auto'
  bottom: number | 'auto'
  transform: string
}

const PAD = 12 // padding around the spotlight highlight rect

function getHighlightRect(target: string): Rect | null {
  const el = document.querySelector(target)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
}

function computeTooltipPos(
  rect: Rect | null,
  position: TutorialStep['tooltipPosition'],
  tooltipH: number,
): TooltipPos {
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (!rect || position === 'center') {
    return {
      top: vh / 2 - tooltipH / 2,
      left: vw / 2,
      bottom: 'auto',
      transform: 'translateX(-50%)',
    }
  }

  const TOOLTIP_W = 310
  const GAP = 12

  if (position === 'above') {
    const topVal = rect.top - tooltipH - GAP
    return {
      top: Math.max(8, topVal),
      left: Math.min(Math.max(8, rect.left + rect.width / 2), vw - TOOLTIP_W - 8),
      bottom: 'auto',
      transform: 'translateX(-50%)',
    }
  }

  if (position === 'below') {
    return {
      top: rect.top + rect.height + GAP,
      left: Math.min(Math.max(8, rect.left + rect.width / 2), vw - TOOLTIP_W - 8),
      bottom: 'auto',
      transform: 'translateX(-50%)',
    }
  }

  // Default: below
  return {
    top: rect.top + rect.height + GAP,
    left: vw / 2,
    bottom: 'auto',
    transform: 'translateX(-50%)',
  }
}

interface TutorialOverlayProps {
  onDone: () => void
}

export function TutorialOverlay({ onDone }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipHeight, setTooltipHeight] = useState(160)

  const step = TUTORIAL_STEPS[stepIndex]
  const totalSteps = TUTORIAL_STEPS.length
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1

  const measureAndSet = useCallback(() => {
    if (step.target) {
      setHighlightRect(getHighlightRect(step.target))
    } else {
      setHighlightRect(null)
    }
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight)
    }
  }, [step.target])

  useEffect(() => {
    measureAndSet()
    // Re-measure after a short tick so the DOM has settled
    const id = setTimeout(measureAndSet, 80)
    window.addEventListener('resize', measureAndSet)
    return () => {
      clearTimeout(id)
      window.removeEventListener('resize', measureAndSet)
    }
  }, [measureAndSet])

  // Capture tooltip height after render
  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight)
    }
  })

  function finish() {
    markTutorialDone()
    onDone()
  }

  function handleNext() {
    if (isLast) { finish(); return }
    setStepIndex(i => i + 1)
  }

  function handlePrev() {
    if (!isFirst) setStepIndex(i => i - 1)
  }

  const tooltipPos = computeTooltipPos(highlightRect, step.tooltipPosition, tooltipHeight)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        pointerEvents: 'all',
      }}
    >
      {/* ── 4-quadrant dark overlay around spotlight ── */}
      {highlightRect ? (
        <>
          {/* Top */}
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            height: highlightRect.top,
            background: 'rgba(0,0,0,0.75)',
          }} />
          {/* Bottom */}
          <div style={{
            position: 'fixed',
            top: highlightRect.top + highlightRect.height,
            left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.75)',
          }} />
          {/* Left */}
          <div style={{
            position: 'fixed',
            top: highlightRect.top,
            left: 0,
            width: highlightRect.left,
            height: highlightRect.height,
            background: 'rgba(0,0,0,0.75)',
          }} />
          {/* Right */}
          <div style={{
            position: 'fixed',
            top: highlightRect.top,
            left: highlightRect.left + highlightRect.width,
            right: 0,
            height: highlightRect.height,
            background: 'rgba(0,0,0,0.75)',
          }} />
          {/* Highlight ring */}
          <div style={{
            position: 'fixed',
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            borderRadius: 12,
            boxShadow: '0 0 0 4px var(--accent), 0 0 0 8px rgba(245,166,35,0.3)',
            pointerEvents: 'none',
          }} />
        </>
      ) : (
        // Full backdrop when no spotlight
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
        }} />
      )}

      {/* ── Tooltip card ── */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: tooltipPos.top === 'auto' ? 'auto' : tooltipPos.top,
          left: tooltipPos.left === 'auto' ? 'auto' : tooltipPos.left,
          bottom: tooltipPos.bottom === 'auto' ? 'auto' : tooltipPos.bottom,
          transform: tooltipPos.transform,
          minWidth: 280,
          maxWidth: 320,
          width: Math.min(320, vw - 32),
          background: 'rgba(8,10,22,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '20px 24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          zIndex: 9010,
        }}
      >
        {/* Step indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 11, color: '#555', fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em' }}>
            {stepIndex + 1} / {totalSteps}
          </span>
          <button
            onClick={finish}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#555',
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              padding: '2px 6px',
            }}
          >
            Skip
          </button>
        </div>

        {/* Title */}
        <p style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--accent)',
          marginBottom: 8,
          lineHeight: 1.3,
        }}>
          {step.title}
        </p>

        {/* Body */}
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          color: '#ccc',
          lineHeight: 1.6,
          marginBottom: 16,
        }}>
          {step.body}
        </p>

        {/* Progress bar */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 16,
        }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= stepIndex ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isFirst && (
            <button
              onClick={handlePrev}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: '#aaa',
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Prev
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              flex: isFirst ? 2 : 2,
              padding: '9px 0',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--base-bg, #08090a)',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {isLast ? "Let's Go!" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
