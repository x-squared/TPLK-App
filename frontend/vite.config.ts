import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const appStackPollingStateMachine = path.resolve(
  __dirname,
  '../../AppStack/frontend/src/views/layout/pollingStateMachine.ts',
)
const appStackGuiTemplateGuidance = path.resolve(
  __dirname,
  '../../AppStack/frontend/src/features/gui-template/docs/templateGuidance.ts',
)
const appStackGuiTemplateData = path.resolve(
  __dirname,
  '../../AppStack/frontend/src/features/gui-template/model/templateDummyData.ts',
)
const tplkFrontendRoot = __dirname

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@appstack/pollingStateMachine': appStackPollingStateMachine,
      '@appstack/guiTemplateGuidance': appStackGuiTemplateGuidance,
      '@appstack/guiTemplateData': appStackGuiTemplateData,
    },
  },
  server: {
    fs: {
      allow: [
        tplkFrontendRoot,
        path.dirname(appStackPollingStateMachine),
        path.dirname(appStackGuiTemplateGuidance),
        path.dirname(appStackGuiTemplateData),
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
