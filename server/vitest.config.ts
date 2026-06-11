import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'azkivz-shared': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
  test: {
    environment: 'node',
  },
})
