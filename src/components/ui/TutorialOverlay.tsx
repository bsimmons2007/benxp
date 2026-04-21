import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TUTORIAL_STEPS, markTutorialDone } from '../../lib/tutorial'
import type { TutorialStep } from '../../lib/tutorial'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface TooltipPos {
  top: number
  left: number
  transform: string
}

const PAD = 10

function getHighlightRect(target: string): Rect | null {
  const el = document.querySelector(target)
  if (!el) return null
  const r = el.getBoundingClientRect()
  // Element must be visible
  if (r.width === 0 && r.height === 0) return null
  return {
    top:    r.top    - PAD,
    left:   r.left   - PAD,
    width:  r.width  + PAD * 2,
    height: r.height + PAD * 2,
  }
}

const TOOLTIP_W = 320

function computeTooltipPos(
  rect: Rect | null,
  position: TutorialStep['tooltipPosition'],
  tooltipH: number,
): TooltipPos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const GAP = 14
  const halfW = TOOLTIP_W / 2

  // Clamp so card never leaves the screen
  function clampLeft(center: number): number {
    return Math.min(Math.max(halfW + 8, center), vw - halfW - 8)
  }

  if (!rect || position === 'center') {
    return {
      top:       Math.round(vh / 2 - tooltipH / 2),
      left:      Math.round(vw / 2),
      transform: 'translateX(-50%)',
    }
  }

  const centerX = rect.left + rect.width / 2

  if (position === 'above') {
    const topVal = rect.top - tooltipH - GAP
    return {
      top:       Math.max(8, topVal),
      left:      clampLeft(centerX),
      transform: 'translateX(-50%)',
    }
  }

  // below (default)
  const topVal = rect.top + rect.height + GAP
  const maxTop = vh - tooltipH - 8
  return {
    top:       Math.min(topVal, maxTop),
    left:      clampLeft(centerX),
    transform: 'translateX(-50%)',
  }
}

interface TutorialOverlayProps {
  onDone: () => void
}

export function TutorialOverlay({ onDone }: TutorialOverlayProps) {
  const navigate    = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null)
  const tooltipRef  = useRef<HTMLDivElement>(null)
  const [tooltipH,  setTooltipH]  = useState(180)

  const step       = TUTORIAL_STEPS[stepIndex]
  const totalSteps = TUTORIAL_STEPS.length
  const isFirst    = stepIndex === 0
  const isLast     = stepIndex === totalSteps - 1
  const vw         = window.innerWidth

  const measure = useCallback(() => {
    const rect = step.target ? getHighlightRect(step.target) : null
    setHighlightRect(rect)
    if (tooltipRef.current) setTooltipH(tooltipRef.current.offsetHeight)
  }, [step.target])

  // When step changes: navigate if needed, then measure after DOM settles
  useEffect(() => {
    if (step.navigateTo) navigate(step.navigateTo)
    setHighlightRect(null)
    const t1 = setTimeout(measure, 120)
    const t2 = setTimeout(measure, 400)   // second pass after page renders
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', measure)
    }
  }, [stepIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep height in sync
  useEffect(() => {
    if (tooltipRef.current) setTooltipH(tooltipRef.current.offsetHeight)
  })

  function finish() { markTutorialDone(); onDone() }

  function goTo(idx: number) {
    setStepIndex(idx)
  }

  const tooltipPos = computeTooltipPos(highlightRect, step.tooltipPosition, tooltipH)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'all' }}>

      {/* ── Spotlight overlay ── */}
      {highlightRect ? (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: Math.max(0, highlightRect.top), background: 'rgba(0,0,0,0.78)' }} />
          <div style={{ position: 'fixed', top: highlightRect.top + highlightRect.height, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.78)' }} />
          <div style={{ position: 'fixed', top: highlightRect.top, left: 0, width: Math.max(0, highlightRect.left), height: highlightRect.height, background: 'rgba(0,0,0,0.78)' }} />
          <div style={{ position: 'fixed', top: highlightRect.top, left: highlightRect.left + highlightRect.width, right: 0, height: highlightRect.height, background: 'rgba(0,0,0,0.78)' }} />
          <div style={{ position: 'fixed', top: highlightRect.top, left: highlightRect.left, width: highlightRect.width, height: highlightRect.height, borderRadius: 12, boxShadow: '0 0 0 3px var(--accent), 0 0 20px 4px rgba(245,166,35,0.25)', pointerEvents: 'none' }} />
        </>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)' }} />
      )}

      {/* ── Tooltip card ── */}
      <div
        ref={tooltipRef}
        style={{
          position:     'fixed',
          top:          tooltipPos.top,
          left:         tooltipPos.left,
          transform:    tooltipPos.transform,
          width:        Math.min(TOOLTIP_W, vw - 24),
          background:   'rgba(8,10,22,0.99)',
          border:       '1px solid rgba(255,255,255,0.13)',
          borderRadius: 18,
          padding:      '20px 22px 18px',
          boxShadow:    '0 28px 72px rgba(0,0,0,0.85)',
          zIndex:       9010,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: '#4a4a5a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {stepIndex + 1} of {totalSteps}
          </span>
          <button onClick={finish} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4a5a', fontSize: 11, padding: '2px 4px' }}>
            Skip tour
          </button>
        </div>

        {/* Title */}
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, lineHeight: 1.3 }}>
          {step.title}
        </p>

        {/* Body */}
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#bbb', lineHeight: 1.65, marginBottom: 18 }}>
          {step.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16, justifyContent: 'center' }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} style={{ width: i === stepIndex ? 16 : 6, height: 6, borderRadius: 3, background: i === stepIndex ? 'var(--accent)' : i < stepIndex ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.1)', transition: 'all 0.2s ease' }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {!isFirst && (
            <button
              onClick={() => goTo(stepIndex - 1)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#888', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => isLast ? finish() : goTo(stepIndex + 1)}
            style={{ flex: 2, padding: '9px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#0d0d1a', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}
          >
            {isLast ? "Let's Go!" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
