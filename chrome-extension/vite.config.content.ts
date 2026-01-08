import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const root = path.resolve(__dirname, 'src');
  const outDir = path.resolve(__dirname, 'build');

  return {
    root,
    base: '',
    plugins: [
      nodePolyfills({
        globals: { Buffer: true, process: true },
        protocolImports: true,
      }),
      react(),
    ],
    resolve: {
      alias: {
        '@': root,
        '@ethersproject/json-wallets': path.resolve(
          __dirname,
          'src/shared/shims/ethers-json-wallets.ts'
        ),
      },
    },
    define: {
      __DEV__: JSON.stringify(!isProduction),
    },
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: isProduction ? false : 'inline',
      rollupOptions: {
        input: {
          'content/inject': path.resolve(root, 'content/inject.tsx'),
        },
        output: {
          format: 'iife',
          inlineDynamicImports: true,
          entryFileNames: 'content/inject.js',
        },
      },
    },
  };
});
