import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { XP_RATES } from '../../lib/xp'
import { today } from '../../lib/utils'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'
import { useStore } from '../../store/useStore'
import { getLastUsed, setLastUsed } from '../../lib/lastUsed'

interface BookForm {
  date_finished: string
  title: string
  author: string
  genre: string
  customGenre: string
  pages: string
  rating: string
}

const BASE_GENRES = ['Fiction', 'Fantasy', 'Sci-Fi', 'Non-Fiction', 'Classic', 'Horror', 'Mystery', 'Thriller', 'Biography', 'Other']

export function LogBookForm() {
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<BookForm>({
    defaultValues: { date_finished: today(), title: '', author: '', genre: getLastUsed('book-genre', 'Fiction'), customGenre: '', pages: '', rating: '' },
  })
  const [toast, setToast] = useState<string | null>(null)
  const [extraGenres, setExtraGenres] = useState<string[]>([])
  const refreshXP = useStore((s) => s.refreshXP)
  const selectedGenre = watch('genre')
  const customGenre = watch('customGenre')

  const onSubmit = async (data: BookForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const finalGenre = data.genre === 'Other' && data.customGenre.trim()
      ? data.customGenre.trim()
      : data.genre

    // Save custom genre to dropdown for future use
    if (data.genre === 'Other' && data.customGenre.trim()) {
      const newGenre = data.customGenre.trim()
      if (!BASE_GENRES.includes(newGenre) && !extraGenres.includes(newGenre)) {
        setExtraGenres((prev) => [...prev, newGenre])
      }
    }

    const { error } = await supabase.from('books').insert({
      user_id: user.id,
      date_finished: data.date_finished,
      title: data.title,
      author: data.author || null,
      genre: finalGenre,
      pages: data.pages ? parseInt(data.pages) : null,
      rating: data.rating ? parseFloat(data.rating) : null,
    })
    if (error) { setToast('Failed to save — try again'); return }

    setLastUsed('book-genre', finalGenre)
    setToast(`+${XP_RATES.book_finished} XP — Book finished!`)
    await refreshXP()
    reset({ date_finished: today(), title: '', author: '', genre: finalGenre, customGenre: '', pages: '', rating: '' })
  }

  const allGenres = [...BASE_GENRES.filter(g => g !== 'Other'), ...extraGenres, 'Other']

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Date Finished" type="date" {...register('date_finished', { required: true })} />
      <Input
        label="Title"
        type="text"
        placeholder="Book title"
        maxLength={200}
        {...register('title', { required: true, maxLength: 200 })}
        error={errors.title ? 'Required' : undefined}
      />
      <Input label="Author" type="text" placeholder="Author name" maxLength={100} {...register('author', { maxLength: 100 })} />

      <div className="flex flex-col gap-1">
        <label className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>Genre</label>
        <select
          {...register('genre')}
          className="px-3 py-2 rounded-lg text-white outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          {allGenres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {selectedGenre === 'Other' && (
        <Input
          label="Custom genre"
          type="text"
          placeholder="e.g. Horror, Western, Manga..."
          maxLength={50}
          {...register('customGenre', { maxLength: 50 })}
          autoFocus
        />
      )}

      <div className="flex gap-3">
        <Input label="Pages" type="number" placeholder="350" className="flex-1" {...register('pages')} />
        <Input label="Rating (1-5)" type="number" step="0.1" min="1" max="5" placeholder="4.5" className="flex-1" {...register('rating')} />
      </div>

      <Button type="submit" fullWidth disabled={isSubmitting || (selectedGenre === 'Other' && !customGenre?.trim())}>
        {isSubmitting ? 'Logging...' : 'Log Book'}
      </Button>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </form>
  )
}
