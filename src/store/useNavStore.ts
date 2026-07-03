import { create } from 'zustand'

interface NavState {
  navOpen:   boolean
  toggleNav: () => void
  closeNav:  () => void

  // Quick-log bottom sheet
  quickLogOpen:     boolean
  quickLogTarget:   string | null   // activity id to auto-expand, or 'open'
  openQuickLog:     (target?: string | null) => void
  closeQuickLog:    () => void
}

export const useNavStore = create<NavState>(set => ({
  navOpen:   false,
  toggleNav: () => set(s => ({ navOpen: !s.navOpen })),
  closeNav:  () => set({ navOpen: false }),

  quickLogOpen:   false,
  quickLogTarget: null,
  openQuickLog:   (target = null) => set({ quickLogOpen: true, quickLogTarget: target }),
  closeQuickLog:  () => set({ quickLogOpen: false, quickLogTarget: null }),
}))
