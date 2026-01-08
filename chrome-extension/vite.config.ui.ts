import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
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
      viteStaticCopy({
        targets: [
          { src: path.resolve(__dirname, 'manifest.json'), dest: '.' },
          { src: path.resolve(__dirname, 'icons'), dest: '.' },
        ],
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
      emptyOutDir: true,
      sourcemap: isProduction ? false : 'inline',
      rollupOptions: {
        input: {
          'popup/popup': path.resolve(root, 'popup/popup.html'),
          'popup/settings': path.resolve(root, 'popup/settings.html'),
          'popup/order-history': path.resolve(root, 'popup/order-history.html'),
          'popup/price-alerts': path.resolve(root, 'popup/price-alerts.html'),
          'popup/portfolio-dashboard': path.resolve(root, 'popup/portfolio-dashboard.html'),
          'popup/limit-orders': path.resolve(root, 'popup/limit-orders.html'),
          'popup/risk-settings': path.resolve(root, 'popup/risk-settings.html'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: '[name][extname]',
        },
      },
    },
  };
});
