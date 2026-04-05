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
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-t-2xl px-4 pt-4 pb-8 pop-in"
        style={{ background: 'rgba(12,16,36,0.98)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '85vh', overflowY: 'auto' }}
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
              className="flex-1 py-3 rounded-xl font-semibold transition-all"
              style={{ background: 'var(--accent)', color: '#1A1A2E', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
