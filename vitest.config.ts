import { defineConfig } from 'vitest/config'

// Standalone config (intentionally not merged into vite.config.ts).
// Pure-function unit tests only — no jsdom/DOM environment needed.
export default defineConfig({
  test: {
    include: ['src/lib/__tests__/**/*.test.ts'],
    environment: 'node',
  },
})
