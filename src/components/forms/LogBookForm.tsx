import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { XP_RATES } from '../../lib/xp'
import { today } from '../../lib/utils'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'
import { useStore } from '../../store/useStore'
import type { BookGenre } from '../../types'

interface BookForm {
  date_finished: string
  title: string
  author: string
  genre: BookGenre
  pages: string
  rating: string
}

const GENRES: BookGenre[] = ['Fiction', 'Fantasy', 'Sci-Fi', 'Non-Fiction', 'Classic', 'Other']

export function LogBookForm() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BookForm>({
    defaultValues: { date_finished: today(), title: '', author: '', genre: 'Fiction', pages: '', rating: '' },
  })
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP = useStore((s) => s.refreshXP)

  const onSubmit = async (data: BookForm) => {
    await supabase.from('books').insert({
      date_finished: data.date_finished,
      title: data.title,
      author: data.author || null,
      genre: data.genre,
      pages: data.pages ? parseInt(data.pages) : null,
      rating: data.rating ? parseFloat(data.rating) : null,
    })

    setToast(`+${XP_RATES.book_finished} XP — Book finished! 📚`)
    await refreshXP()
    reset({ date_finished: today(), title: '', author: '', genre: 'Fiction', pages: '', rating: '' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Date Finished" type="date" {...register('date_finished', { required: true })} />
      <Input
        label="Title"
        type="text"
        placeholder="Book title"
        {...register('title', { required: true })}
        error={errors.title ? 'Required' : undefined}
      />
      <Input label="Author" type="text" placeholder="Author name" {...register('author')} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: '#888888' }}>Genre</label>
        <select
          {...register('genre')}
          className="px-3 py-2 rounded-lg text-white outline-none"
          style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="flex gap-3">
        <Input label="Pages" type="number" placeholder="350" className="flex-1" {...register('pages')} />
        <Input label="Rating (1-5)" type="number" step="0.1" min="1" max="5" placeholder="4.5" className="flex-1" {...register('rating')} />
      </div>

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Logging...' : 'Log Book'}
      </Button>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </form>
  )
}
