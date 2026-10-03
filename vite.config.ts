/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devApi } from './dev/api-plugin'

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  test: { environment: 'node', include: ['shared/**/*.test.ts', 'api/**/*.test.ts', 'src/lib/**/*.test.ts'] },
})
