import { useStore } from '../store/useStore'

/** Reads userName from the global store — no per-component getUser() calls. */
export function useUserName(): string {
  return useStore(s => s.userName)
}
