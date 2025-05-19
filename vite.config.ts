// PlugIn/examify-json-editor/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const githubRepoName = 'examify-json-editor';
export default defineConfig(({ command }) => {
  const base = command === 'build' ? `/${githubRepoName}/` : '/';
  return {
    plugins: [react()],
    base: base, // Will be /PlugIn/examify-json-editor/ for builds
    build: {
      outDir: 'dist',
    },
  };
});