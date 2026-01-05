const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      'background/service-worker': './src/background/service-worker.ts',
      'content/inject': './src/content/inject.tsx',
      'popup/popup': './src/popup/popup.tsx',
      'popup/settings': './src/popup/settings.tsx',
      'popup/order-history-page': './src/popup/order-history-page.tsx',
      'popup/price-alerts-page': './src/popup/price-alerts-page.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.build.json',
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      fallback: {
        crypto: require.resolve('crypto-browserify'), // Polyfill Node.js crypto for CLOB client
        http: false,
        https: false,
        zlib: false,
        url: false,
        buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util/'),
        assert: require.resolve('assert/'),
        os: require.resolve('os-browserify/browser'),
      },
    },
    plugins: [
      // Provide Buffer globally (needed for ethers.js and CLOB client)
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup/popup.html',
        chunks: ['popup/popup'],
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/settings.html',
        filename: 'popup/settings.html',
        chunks: ['popup/settings'],
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/order-history.html',
        filename: 'popup/order-history.html',
        chunks: ['popup/order-history-page'],
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/price-alerts.html',
        filename: 'popup/price-alerts.html',
        chunks: ['popup/price-alerts-page'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'src/content/styles.css', to: 'content/styles.css' },
          { from: 'icons', to: 'icons' },
        ],
      }),
    ],
    devtool: isProduction ? false : 'inline-source-map',
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: (chunk) => chunk.name !== 'background/service-worker',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
          },
          shared: {
            name: 'shared',
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    },
  };
};
