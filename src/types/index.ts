export interface LiftingLog {
  id: string
  created_at: string
  date: string
  bodyweight: number | null
  lift: 'Bench' | 'Squat' | 'Deadlift' | 'PullUps' | 'PushUps'
  weight: number | null
  sets: number | null
  reps: number | null
  volume: number | null
  est_1rm: number | null
  is_pr: boolean
}

export interface SkateSession {
  id: string
  created_at: string
  date: string
  miles: number
  duration: string | null
  avg_pace: number | null
  fastest_mile: number | null
  calories: number | null
}

export interface FortniteGame {
  id: string
  created_at: string
  date: string
  mode: 'Solos' | 'Duos' | 'Squads' | null
  season: string | null
  placement: number | null
  kills: number
  accuracy: number | null
  win: boolean
}

export interface Book {
  id: string
  created_at: string
  date_finished: string | null
  title: string
  author: string | null
  genre: string | null
  pages: number | null
  rating: number | null
}

export interface SleepLog {
  id: string
  created_at: string
  date: string
  bedtime: string | null
  hours_slept: number | null
  wake_time: string | null
  sleep_score: number | null
}

export interface BodyweightLog {
  id: string
  created_at: string
  date: string
  weight_lbs: number
}

export interface PrHistory {
  id: string
  created_at: string
  date: string
  lift: string
  est_1rm: number
  notes: string | null
}

export interface Challenge {
  id: string
  created_at: string
  tier: 'Weekly' | 'Monthly' | 'Boss'
  challenge_name: string
  category: string | null
  target: string | null
  xp_reward: number
  status: string
  auto_verified: boolean
  notes: string | null
  completed_at: string | null
}

export interface ToRead {
  id: string
  created_at: string
  title: string
  author: string | null
  genre: string | null
  priority: 'High' | 'Medium' | 'Low' | null
  notes: string | null
}

export interface MoodLog {
  id: string
  created_at: string
  date: string
  mood: number | null
  energy: number | null
  stress: number | null
  activities: string | null
  notes: string | null
}

export type LiftType = 'Bench' | 'Squat' | 'Deadlift' | 'PullUps' | 'PushUps'
export type BookGenre = 'Fiction' | 'Fantasy' | 'Sci-Fi' | 'Non-Fiction' | 'Classic' | 'Other'
