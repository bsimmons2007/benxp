import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { EmptyState } from '../components/ui/EmptyState'
import { EditIcon, CheckIcon, BookIcon } from '../components/ui/Icon'
import { supabase } from '../lib/supabase'
import { XP_RATES } from '../lib/xp'
import { today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playGoalComplete } from '../lib/sounds'
import type { Book, ToRead } from '../types'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Types ────────────────────────────────────────────────────
type SortKey = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc' | 'rating_desc' | 'rating_asc' | 'pages_desc' | 'pages_asc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc',   label: 'Newest first' },
  { key: 'date_asc',    label: 'Oldest first' },
  { key: 'title_asc',   label: 'A → Z' },
  { key: 'title_desc',  label: 'Z → A' },
  { key: 'rating_desc', label: 'Highest rated' },
  { key: 'rating_asc',  label: 'Lowest rated' },
  { key: 'pages_desc',  label: 'Most pages' },
  { key: 'pages_asc',   label: 'Fewest pages' },
]

const BASE_GENRES = ['Fiction', 'Fantasy', 'Sci-Fi', 'Non-Fiction', 'Classic', 'Horror', 'Mystery', 'Thriller', 'Biography', 'Other']

const GENRE_COLORS: Record<string, string> = {
  Fantasy: '#7B2FBE', 'Sci-Fi': '#0F3460', Fiction: '#1ABC9C',
  'Non-Fiction': '#E67E22', Classic: '#8B6914', Horror: '#E94560',
  Mystery: '#2C3E50', Thriller: '#C0392B', Biography: '#27AE60',
}

// ── Star rating ──────────────────────────────────────────────
function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
    <span className="text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < full ? 'var(--accent)' : half && i === full ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }}>
          {i < full ? '★' : half && i === full ? '⯨' : '☆'}
        </span>
      ))}
      <span className="ml-1 text-xs" style={{ color: '#888' }}>{rating.toFixed(1)}</span>
    </span>
  )
}

function GenreChip({ genre }: { genre: string | null }) {
  if (!genre) return null
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: GENRE_COLORS[genre] ?? '#555', color: '#fff' }}>
      {genre}
    </span>
  )
}

// ── Mark Finished modal ──────────────────────────────────────
function MarkFinishedModal({ book, onClose, onSaved }: { book: Book; onClose: () => void; onSaved: () => void }) {
  const [date,   setDate]   = useState(today())
  const [rating, setRating] = useState('')
  const [saving, setSaving] = useState(false)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)

  async function save() {
    setSaving(true)
    await supabase.from('books').update({
      date_finished: date,
      rating: rating ? parseFloat(rating) : null,
    }).eq('id', book.id)
    playGoalComplete()
    await refreshXP()
    refreshActivity()
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <EditModal title={`Finished: ${book.title}`} onClose={onClose} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="px-3 py-2 rounded-lg text-center" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)' }}>
          <p style={{ color: 'var(--accent)', fontSize: 13 }}>+{XP_RATES.book_finished} XP on save</p>
        </div>
        <Input label="Date Finished" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Rating (1–5, optional)" type="number" step="0.1" min="1" max="5" placeholder="4.5" value={rating} onChange={e => setRating(e.target.value)} />
      </div>
    </EditModal>
  )
}

// ── Edit book modal ──────────────────────────────────────────
function EditBookModal({ book, onClose, onSaved }: { book: Book; onClose: () => void; onSaved: () => void }) {
  const [rating, setRating] = useState(String(book.rating ?? ''))
  const [pages,  setPages]  = useState(String(book.pages ?? ''))
  const [date,   setDate]   = useState(book.date_finished ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('books').update({
      rating: rating ? parseFloat(rating) : null,
      pages:  pages  ? parseInt(pages)    : null,
      date_finished: date || null,
    }).eq('id', book.id)
    setSaving(false); onSaved(); onClose()
  }

  async function del() {
    await supabase.from('books').delete().eq('id', book.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={book.title} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Date Finished</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Rating (1–5)</label>
            <input type="number" step="0.1" min="1" max="5" value={rating} onChange={e => setRating(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Pages</label>
            <input type="number" value={pages} onChange={e => setPages(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>
    </EditModal>
  )
}

// ── Currently Reading card ───────────────────────────────────
function CurrentlyReadingCard({ book, onUpdated }: { book: Book; onUpdated: () => void }) {
  const [finishing, setFinishing] = useState(false)
  const [editing,   setEditing]   = useState(false)

  return (
    <>
      <div className="rounded-xl p-4 mb-3 card-animate" style={{
        background: 'rgba(16,24,52,0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(245,166,35,0.25)',
        boxShadow: '0 0 20px rgba(245,166,35,0.08)',
      }}>
        <div className="flex items-start gap-3">
          {/* Reading indicator */}
          <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', background: 'var(--accent)', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white leading-tight" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>{book.title}</p>
            {book.author && <p className="text-sm mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{book.author}</p>}
            <div className="flex items-center gap-2 mt-2">
              <GenreChip genre={book.genre} />
              {book.pages && <span style={{ color: '#444', fontSize: 11 }}>{book.pages} pp</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => setFinishing(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--accent)', color: 'var(--base-bg)',
                border: 'none', borderRadius: 8,
                padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <CheckIcon size={12} color="var(--base-bg)" /> Finished
            </button>
            <button
              onClick={() => setEditing(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}
            >
              <EditIcon size={13} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      </div>
      {finishing && <MarkFinishedModal book={book} onClose={() => setFinishing(false)} onSaved={onUpdated} />}
      {editing   && <EditBookModal     book={book} onClose={() => setEditing(false)}   onSaved={onUpdated} />}
    </>
  )
}

// ── Finished book card ───────────────────────────────────────
function BookCard({ book, onEdited }: { book: Book; onEdited: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  return (
    <>
      <div
        className="rounded-xl p-4 mb-3 card-animate cursor-pointer"
        style={{
          background: 'rgba(16,24,52,0.7)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${expanded ? 'var(--accent)' : 'rgba(255,255,255,0.07)'}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          transition: 'border-color 0.2s',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-1 rounded-full flex-shrink-0 self-stretch" style={{ background: GENRE_COLORS[book.genre ?? ''] ?? '#555', minHeight: 40 }} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white leading-tight" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>{book.title}</p>
            {book.author && <p className="text-sm mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{book.author}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <GenreChip genre={book.genre} />
              <Stars rating={book.rating} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {book.date_finished && <p className="text-xs" style={{ color: '#888' }}>{formatDate(book.date_finished)}</p>}
            {book.pages && <p className="text-xs" style={{ color: '#444' }}>{book.pages} pp</p>}
            <button onClick={e => { e.stopPropagation(); setEditing(true) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', marginTop: 4 }}>
              <EditIcon size={13} color="var(--text-muted)" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 pop-in" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Genre',    value: book.genre ?? '—' },
                { label: 'Pages',    value: book.pages ?? '—' },
                { label: 'Rating',   value: <Stars rating={book.rating} /> },
                { label: 'Finished', value: book.date_finished ? formatDate(book.date_finished) : '—' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#444', fontFamily: 'Cormorant Garamond, serif' }}>{item.label}</p>
                  <p className="text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {editing && <EditBookModal book={book} onClose={() => setEditing(false)} onSaved={onEdited} />}
    </>
  )
}

// ── Log Book form ────────────────────────────────────────────
interface BookForm {
  title: string; author: string; genre: string; customGenre: string
  pages: string; date_finished: string; rating: string
  status: 'reading' | 'finished'
}

function LogBookPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [extraGenres, setExtraGenres] = useState<string[]>([])
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)

  const { register, handleSubmit, watch, reset, formState: { isSubmitting, errors } } = useForm<BookForm>({
    defaultValues: { title: '', author: '', genre: 'Fiction', customGenre: '', pages: '', date_finished: today(), rating: '', status: 'reading' },
  })
  const genre  = watch('genre')
  const status = watch('status')
  const allGenres = [...BASE_GENRES.filter(g => g !== 'Other'), ...extraGenres, 'Other']

  const onSubmit = async (data: BookForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const finalGenre = data.genre === 'Other' && data.customGenre.trim() ? data.customGenre.trim() : data.genre
    if (data.genre === 'Other' && data.customGenre.trim() && !BASE_GENRES.includes(data.customGenre.trim()) && !extraGenres.includes(data.customGenre.trim())) {
      setExtraGenres(p => [...p, data.customGenre.trim()])
    }

    const isFinished = data.status === 'finished'

    await supabase.from('books').insert({
      user_id:       user.id,
      title:         data.title,
      author:        data.author || null,
      genre:         finalGenre,
      pages:         data.pages ? parseInt(data.pages) : null,
      date_finished: isFinished ? data.date_finished : null,
      rating:        isFinished && data.rating ? parseFloat(data.rating) : null,
    })

    if (isFinished) {
      setToast(`+${XP_RATES.book_finished} XP — Book logged!`)
      await refreshXP()
      refreshActivity()
    } else {
      setToast('Added to Currently Reading')
    }

    reset({ title: '', author: '', genre: 'Fiction', customGenre: '', pages: '', date_finished: today(), rating: '', status: 'reading' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: open ? '#1A1A2E' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Add Book'}
      </button>

      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

            {/* Status toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {(['reading', 'finished'] as const).map(s => (
                <label key={s} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                  <input type="radio" value={s} {...register('status')} style={{ display: 'none' }} />
                  <div style={{
                    padding: '10px 0', fontSize: 13, fontWeight: 600,
                    background: status === s ? 'var(--accent)' : 'transparent',
                    color: status === s ? 'var(--base-bg)' : '#888',
                    transition: 'all 0.15s ease',
                  }}>
                    {s === 'reading' ? 'Currently Reading' : '✓ Finished'}
                  </div>
                </label>
              ))}
            </div>

            <Input label="Title" type="text" placeholder="Book title" {...register('title', { required: true })} error={errors.title ? 'Required' : undefined} />
            <Input label="Author" type="text" placeholder="Author name" {...register('author')} />

            <div className="flex flex-col gap-1">
              <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Genre</label>
              <select {...register('genre')} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}>
                {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {genre === 'Other' && (
              <Input label="Custom genre" type="text" placeholder="e.g. Horror, Western…" {...register('customGenre')} />
            )}

            <Input label="Pages (optional)" type="number" placeholder="350" {...register('pages')} />

            {status === 'finished' && (
              <>
                <Input label="Date Finished" type="date" {...register('date_finished')} />
                <Input label="Rating (1–5, optional)" type="number" step="0.1" min="1" max="5" placeholder="4.5" {...register('rating')} />
              </>
            )}

            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : status === 'reading' ? 'Start Reading' : 'Log Finished Book'}
            </Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── To-Read section ──────────────────────────────────────────
interface ToReadForm { title: string; author: string; genre: string; priority: 'High' | 'Medium' | 'Low' }
const PRIORITY_COLORS = { High: '#E94560', Medium: '#F5A623', Low: '#27AE60' }

function ToReadSection() {
  const [books, setBooks]     = useState<ToRead[]>([])
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset } = useForm<ToReadForm>({
    defaultValues: { title: '', author: '', genre: '', priority: 'Medium' },
  })

  async function load() {
    const { data } = await supabase.from('to_read').select('*').order('created_at', { ascending: false })
    setBooks(data ?? [])
  }
  useEffect(() => { load() }, [])

  const onSubmit = async (data: ToReadForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('to_read').insert({ user_id: user.id, title: data.title, author: data.author || null, genre: data.genre || null, priority: data.priority })
    reset(); setShowForm(false); load()
  }

  async function remove(id: string) {
    await supabase.from('to_read').delete().eq('id', id)
    load()
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-white" style={{ fontFamily: 'Cinzel, serif', fontSize: 16 }}>To-Read List</p>
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-sm px-3 py-1.5 rounded-lg font-medium"
          style={{ background: showForm ? 'var(--accent)' : 'rgba(255,255,255,0.06)', color: showForm ? '#1A1A2E' : 'var(--accent)', border: '1px solid var(--accent)' }}
        >
          {showForm ? '✕' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl p-4 mb-4 pop-in flex flex-col gap-3" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Input label="Title" type="text" {...register('title', { required: true })} />
          <Input label="Author" type="text" {...register('author')} />
          <div className="flex gap-2">
            <Input label="Genre" type="text" className="flex-1" {...register('genre')} />
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Priority</label>
              <select {...register('priority')} className="px-3 py-3 rounded-lg text-white outline-none" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
          </div>
          <Button type="submit" fullWidth>Add to List</Button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {books.map(b => (
          <div key={b.id} className="flex items-center justify-between px-4 py-3 rounded-xl card-animate" style={{ background: 'rgba(16,24,52,0.65)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: b.priority ? PRIORITY_COLORS[b.priority] : '#555' }} />
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{b.title}</p>
                {b.author && <p className="text-xs truncate" style={{ color: '#888' }}>{b.author}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {b.priority && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: PRIORITY_COLORS[b.priority], color: '#fff' }}>{b.priority}</span>
              )}
              <button onClick={() => remove(b.id)} style={{ color: '#444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          </div>
        ))}
        {books.length === 0 && <p className="text-sm py-2" style={{ color: '#888' }}>No books in list yet.</p>}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export function Books() {
  usePageTitle('Books')
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [sort, setSort]           = useState<SortKey>('date_desc')
  const [filterGenre, setFilterGenre] = useState('All')

  async function load() {
    const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false })
    setAllBooks(data ?? [])
  }
  useEffect(() => { load() }, [])

  const reading  = allBooks.filter(b => !b.date_finished)
  const finished = allBooks.filter(b => !!b.date_finished)

  const genres = ['All', ...Array.from(new Set(finished.map(b => b.genre).filter(Boolean) as string[]))]

  const sorted = [...finished]
    .filter(b => filterGenre === 'All' || b.genre === filterGenre)
    .sort((a, b) => {
      switch (sort) {
        case 'date_desc':   return (b.date_finished ?? '').localeCompare(a.date_finished ?? '')
        case 'date_asc':    return (a.date_finished ?? '').localeCompare(b.date_finished ?? '')
        case 'title_asc':   return a.title.localeCompare(b.title)
        case 'title_desc':  return b.title.localeCompare(a.title)
        case 'rating_desc': return (b.rating ?? 0) - (a.rating ?? 0)
        case 'rating_asc':  return (a.rating ?? 0) - (b.rating ?? 0)
        case 'pages_desc':  return (b.pages ?? 0) - (a.pages ?? 0)
        case 'pages_asc':   return (a.pages ?? 0) - (b.pages ?? 0)
        default: return 0
      }
    })

  const avgRating  = finished.filter(b => b.rating).length
    ? finished.reduce((s, b) => s + (b.rating ?? 0), 0) / finished.filter(b => b.rating).length
    : 0
  const totalPages = finished.reduce((s, b) => s + (b.pages ?? 0), 0)

  return (
    <>
      <TopBar title="Books" />
      <PageWrapper>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Read',       value: finished.length },
            { label: 'Avg Rating', value: avgRating ? avgRating.toFixed(1) + '★' : '—' },
            { label: 'Pages',      value: totalPages.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'rgba(16,24,52,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Add book */}
        <LogBookPanel onLogged={load} />

        {/* Currently reading */}
        {reading.length > 0 && (
          <div className="mb-5">
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent)' }}>
              Currently Reading ({reading.length})
            </p>
            {reading.map(book => (
              <CurrentlyReadingCard key={book.id} book={book} onUpdated={load} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {allBooks.length === 0 && (
          <EmptyState
            icon={<BookIcon size={64} color="var(--text-muted)" />}
            title="No books yet"
            sub="Log your first finished book above to start building your reading history."
          />
        )}

        {/* Genre filter */}
        {finished.length > 0 && (
          <>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: '#444' }}>
              Finished ({finished.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: 'none' }}>
              {genres.map(g => (
                <button
                  key={g}
                  onClick={() => setFilterGenre(g)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
                  style={filterGenre === g
                    ? { background: 'var(--accent)', color: '#1A1A2E' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#888', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: '#888' }}>{sorted.length} books</p>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                className="text-sm px-3 py-1.5 rounded-lg outline-none"
                style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', color: '#CCCCCC' }}
              >
                {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>

            {sorted.map(book => <BookCard key={book.id} book={book} onEdited={load} />)}
          </>
        )}

        <ToReadSection />
      </PageWrapper>
    </>
  )
}
