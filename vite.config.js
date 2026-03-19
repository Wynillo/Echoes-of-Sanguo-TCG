import { defineConfig } from 'vite'
export default defineConfig({
  root: '.',
  build: { outDir: 'dist' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
  }
})
