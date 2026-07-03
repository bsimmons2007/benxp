import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { CloseIcon } from './Icon'

interface EditModalProps {
  title:     string
  onClose:   () => void
  onDelete?: () => void
  onSave?:   () => void
  saving?:   boolean
  children:  ReactNode
}

export function EditModal({ title, onClose, onDelete, onSave, saving, children }: EditModalProps) {
  const [deleteArmed, setDeleteArmed] = useState(false)
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (armTimer.current) clearTimeout(armTimer.current) }, [])

  function handleDelete() {
    if (!onDelete) return
    if (deleteArmed) {
      if (armTimer.current) clearTimeout(armTimer.current)
      setDeleteArmed(false)
      onDelete()
      return
    }
    setDeleteArmed(true)
    armTimer.current = setTimeout(() => setDeleteArmed(false), 3000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full pop-in"
        style={{
          background:   'var(--surface-3)',
          border:       '1px solid var(--border-default)',
          borderRadius: 20,
          padding:      '20px 20px 24px',
          maxHeight:    '80vh',
          overflowY:    'auto',
          maxWidth:     480,
          boxShadow:    'var(--shadow-lg)',
        }}
      >
        {/* Handle bar */}
        <div style={{
          width: 36, height: 4, borderRadius: 99, margin: '0 auto 18px',
          background: 'var(--border-default)',
        }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {title}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: 'var(--surface-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {children}

        {/* Actions */}
        {(onDelete || onSave) && (
          <div className="flex gap-3 mt-6">
            {onDelete && (
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl font-semibold transition-all"
                style={{
                  background: deleteArmed ? 'var(--red)' : 'color-mix(in srgb, var(--red) 10%, transparent)',
                  color:      deleteArmed ? 'var(--base-bg)' : 'var(--red)',
                  border:     deleteArmed ? '1px solid var(--red)' : '1px solid color-mix(in srgb, var(--red) 25%, transparent)',
                  fontSize:   14,
                }}
              >
                {deleteArmed ? 'Tap again to confirm' : 'Delete'}
              </button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2"
                style={{
                  background: 'var(--accent)',
                  color:      'var(--base-bg)',
                  opacity:    saving ? 0.65 : 1,
                  fontSize:   14,
                  border:     'none',
                  cursor:     saving ? 'default' : 'pointer',
                }}
              >
                {saving && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
