import path from 'path';
import { defineConfig } from 'vite';
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
      target: 'es2020',
      rollupOptions: {
        input: {
          'background/service-worker': path.resolve(root, 'background/service-worker.ts'),
        },
        output: {
          format: 'es',
          inlineDynamicImports: true,
          entryFileNames: 'background/service-worker.js',
        },
      },
    },
  };
});
