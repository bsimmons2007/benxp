import { create } from 'zustand'

interface NavState {
  navOpen:   boolean
  toggleNav: () => void
  closeNav:  () => void
}

export const useNavStore = create<NavState>(set => ({
  navOpen:   false,
  toggleNav: () => set(s => ({ navOpen: !s.navOpen })),
  closeNav:  () => set({ navOpen: false }),
}))
