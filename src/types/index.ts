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
  rpe: number | null
  rest_secs: number | null
  duration_secs: number | null
}

export interface Goal {
  id: string
  created_at: string
  user_id: string
  title: string
  metric_key: string
  target_value: number
  target_unit: string
  xp_reward: number
  status: 'active' | 'completed'
  completed_at: string | null
}

export interface CardioSession {
  id: string
  created_at: string
  date: string
  activity: 'run' | 'bike' | 'swim' | 'walk'
  distance_miles: number
  duration_mins: number | null
  notes: string | null
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
  is_ranked: boolean
  rank_name: string | null
}

export interface BasketballSession {
  id: string
  created_at: string
  date: string
  fg_made: number
  fg_attempted: number
  three_made: number
  three_attempted: number
  ft_made: number
  ft_attempted: number
  points: number
  assists: number
  rebounds: number
  steals: number
  blocks: number
  turnovers: number
  notes: string | null
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

export type LiftType = string   // open — any exercise from the exercises table or custom
export type BookGenre = 'Fiction' | 'Fantasy' | 'Sci-Fi' | 'Non-Fiction' | 'Classic' | 'Other'
