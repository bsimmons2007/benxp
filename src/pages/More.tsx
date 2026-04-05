import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { today } from '../lib/utils'
import type { ToRead, MoodLog } from '../types'

// --- To-Read List ---

interface ToReadForm {
  title: string
  author: string
  genre: string
  priority: 'High' | 'Medium' | 'Low'
  notes: string
}

function ToReadList() {
  const [books, setBooks] = useState<ToRead[]>([])
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset } = useForm<ToReadForm>({
    defaultValues: { title: '', author: '', genre: '', priority: 'Medium', notes: '' },
  })

  async function load() {
    const { data } = await supabase.from('to_read').select('*').order('created_at', { ascending: false })
    setBooks(data ?? [])
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data: ToReadForm) => {
    await supabase.from('to_read').insert({
      title: data.title,
      author: data.author || null,
      genre: data.genre || null,
      priority: data.priority,
      notes: data.notes || null,
    })
    reset()
    setShowForm(false)
    load()
  }

  const priorityColors = { High: '#E94560', Medium: '#F5A623', Low: '#27AE60' }

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-white">To-Read List</h2>
        <Button variant="secondary" onClick={() => setShowForm(!showForm)} className="text-xs px-3 py-1">
          {showForm ? 'Cancel' : '+ Add'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Input label="Title" type="text" {...register('title', { required: true })} />
          <Input label="Author" type="text" {...register('author')} />
          <div className="flex gap-2">
            <Input label="Genre" type="text" className="flex-1" {...register('genre')} />
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium" style={{ color: '#888' }}>Priority</label>
              <select
                {...register('priority')}
                className="px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <Button type="submit" fullWidth>Add Book</Button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {books.map((b) => (
          <div key={b.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p className="text-sm font-medium text-white">{b.title}</p>
              {b.author && <p className="text-xs" style={{ color: '#888' }}>{b.author}</p>}
            </div>
            {b.priority && (
              <Badge label={b.priority} color={priorityColors[b.priority]} />
            )}
          </div>
        ))}
        {books.length === 0 && <p style={{ color: '#888' }} className="text-sm">No books in list yet.</p>}
      </div>
    </Card>
  )
}

// --- Mood Log ---

interface MoodForm {
  date: string
  mood: string
  energy: string
  stress: string
  activities: string
  notes: string
}

function SliderField({ label, name, register }: { label: string; name: string; register: ReturnType<typeof useForm<MoodForm>>['register'] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" style={{ color: '#888' }}>{label} (1-10)</label>
      <input
        type="range"
        min="1"
        max="10"
        step="1"
        {...register(name as keyof MoodForm)}
        className="w-full accent-yellow-400"
      />
    </div>
  )
}

function MoodSection() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<MoodForm>({
    defaultValues: { date: today(), mood: '7', energy: '7', stress: '5', activities: '', notes: '' },
  })
  const [recent, setRecent] = useState<MoodLog[]>([])

  async function loadRecent() {
    const { data } = await supabase
      .from('mood_log')
      .select('*')
      .order('date', { ascending: false })
      .limit(7)
    setRecent(data ?? [])
  }

  useEffect(() => { loadRecent() }, [])

  const onSubmit = async (data: MoodForm) => {
    await supabase.from('mood_log').insert({
      date: data.date,
      mood: parseInt(data.mood),
      energy: parseInt(data.energy),
      stress: parseInt(data.stress),
      activities: data.activities || null,
      notes: data.notes || null,
    })
    reset({ date: today(), mood: '7', energy: '7', stress: '5', activities: '', notes: '' })
    loadRecent()
  }

  return (
    <Card>
      <h2 className="font-semibold text-white mb-4">Mood Check-in</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Date" type="date" {...register('date', { required: true })} />
        <SliderField label="Mood" name="mood" register={register} />
        <SliderField label="Energy" name="energy" register={register} />
        <SliderField label="Stress" name="stress" register={register} />
        <Input label="Activities" type="text" placeholder="Gym, reading, skating..." {...register('activities')} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: '#888' }}>Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="px-3 py-2 rounded-lg text-white outline-none resize-none"
            style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="How was today?"
          />
        </div>
        <Button type="submit" fullWidth disabled={isSubmitting}>Log Mood</Button>
      </form>

      {recent.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium mb-2" style={{ color: '#888' }}>Last 7 days</p>
          <div className="flex gap-1">
            {[...recent].reverse().map((r) => (
              <div key={r.id} className="flex-1 text-center">
                <div
                  className="mx-auto w-2 rounded-full"
                  style={{ height: `${((r.mood ?? 5) / 10) * 40 + 8}px`, background: '#F5A623', minHeight: 8 }}
                />
                <p className="text-xs mt-1" style={{ color: '#888' }}>{r.mood}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export function More() {
  return (
    <>
      <TopBar title="More" />
      <PageWrapper>
        <ToReadList />
        <MoodSection />
      </PageWrapper>
    </>
  )
}
