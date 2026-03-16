import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const appStackPollingStateMachine = path.resolve(
  __dirname,
  '../../AppStack/frontend/src/views/layout/pollingStateMachine.ts',
)
const tplkFrontendRoot = __dirname

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@appstack/pollingStateMachine': appStackPollingStateMachine,
    },
  },
  server: {
    fs: {
      allow: [tplkFrontendRoot, path.dirname(appStackPollingStateMachine)],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
