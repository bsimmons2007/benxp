import type { ReactNode } from 'react'

interface EditModalProps {
  title: string
  onClose: () => void
  onDelete?: () => void
  onSave?: () => void
  saving?: boolean
  children: ReactNode
}

export function EditModal({ title, onClose, onDelete, onSave, saving, children }: EditModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-2xl px-5 pt-5 pb-6 pop-in"
        style={{ background: 'rgba(18,22,46,0.98)', border: '1px solid var(--border)', maxHeight: '80vh', overflowY: 'auto', maxWidth: 480 }}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.2)' }} />

        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-white text-lg" style={{ fontFamily: 'Cinzel, serif' }}>{title}</p>
          <button onClick={onClose} className="text-2xl" style={{ color: '#666' }}>✕</button>
        </div>

        {children}

        <div className="flex gap-3 mt-5">
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 py-3 rounded-xl font-semibold transition-all"
              style={{ background: 'rgba(233,69,96,0.15)', color: '#E94560', border: '1px solid rgba(233,69,96,0.3)' }}
            >
              Delete
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)', color: 'var(--base-bg)', opacity: saving ? 0.65 : 1 }}
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
      </div>
    </div>
  )
}
