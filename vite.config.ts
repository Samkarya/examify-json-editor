// PlugIn/examify-json-editor/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const githubRepoName = 'PlugIn';
const appSubdirectory = 'examify-json-editor'; // The directory you want the app to live in on GitHub Pages

export default defineConfig(({ command }) => {
  const base = command === 'build' ? `/${githubRepoName}/${appSubdirectory}/` : '/';
  return {
    plugins: [react()],
    base: base, // Will be /PlugIn/examify-json-editor/ for builds
    build: {
      outDir: 'dist',
    },
  };
});