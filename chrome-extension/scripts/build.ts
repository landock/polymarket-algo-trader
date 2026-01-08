import { mkdir, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, 'src');
const buildDir = path.join(rootDir, 'build');
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const debugBuild = process.env.BUILD_DEBUG === '1';

const define = {
  __DEV__: JSON.stringify(!isProduction),
  'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
};

const resolvePackageEntry = (pkg: string, entry: string) => {
  const pkgJson = require.resolve(`${pkg}/package.json`, { paths: [rootDir] });
  return path.join(path.dirname(pkgJson), entry);
};

const nodeBuiltinAliases: Record<string, string> = {
  assert: resolvePackageEntry('assert', 'build/assert.js'),
  buffer: resolvePackageEntry('buffer', 'index.js'),
  crypto: resolvePackageEntry('crypto-browserify', 'index.js'),
  events: resolvePackageEntry('events', 'events.js'),
  http: resolvePackageEntry('stream-http', 'index.js'),
  https: resolvePackageEntry('https-browserify', 'index.js'),
  os: resolvePackageEntry('os-browserify', 'browser.js'),
  path: resolvePackageEntry('path-browserify', 'index.js'),
  process: resolvePackageEntry('process', 'browser.js'),
  stream: resolvePackageEntry('stream-browserify', 'index.js'),
  util: resolvePackageEntry('util', 'util.js'),
  url: resolvePackageEntry('url', 'url.js'),
  zlib: resolvePackageEntry('browserify-zlib', 'lib/index.js'),
};

const runtimeShimPath = path.join(srcDir, 'shared/shims/runtime.ts');

const aliasPlugin = {
  name: 'alias-node-builtins',
  setup(build: any) {
    build.onResolve({ filter: /^@ethersproject\/json-wallets$/ }, () => ({
      path: path.join(srcDir, 'shared/shims/ethers-json-wallets.ts'),
    }));

    build.onResolve(
      {
        filter:
          /^(node:)?(assert|buffer|crypto|events|http|https|os|path|process|stream|url|util|zlib)(\/.*)?$/,
      },
      (args: any) => {
        const raw = args.path.replace(/^node:/, '');
        const [base, ...rest] = raw.split('/');
        const mapped = nodeBuiltinAliases[base];
        if (!mapped) {
          return null;
        }

        let resolved = mapped;

        if (rest.length > 0) {
          const subpath = rest.join('/');
          const candidate = path.join(path.dirname(resolved), subpath);
          try {
            resolved = require.resolve(candidate, { paths: [rootDir] });
          } catch {
            if (debugBuild) {
              console.warn(`[build] No subpath for ${raw}, using ${mapped}`);
            }
          }
        }

        if (debugBuild) {
          console.log(`[build] resolve ${args.path} -> ${resolved}`);
        }

        return { path: resolved, namespace: 'file' };
      }
    );
  },
};

const runtimeShimPlugin = (entrypoints: string[]) => ({
  name: 'runtime-shim',
  setup(build: any) {
    const entrypointSet = new Set(entrypoints.map((entry) => path.resolve(entry)));
    build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args: any) => {
      if (!entrypointSet.has(path.resolve(args.path))) {
        return null;
      }
      const contents = await Bun.file(args.path).text();
      let relative = path.relative(path.dirname(args.path), runtimeShimPath);
      if (!relative.startsWith('.')) {
        relative = `./${relative}`;
      }
      relative = relative.replace(/\\/g, '/');

      return {
        contents: `import '${relative}';\n${contents}`,
        loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts',
      };
    });
  },
});

async function copyStaticAssets() {
  await mkdir(buildDir, { recursive: true });

  await copyFile(path.join(rootDir, 'manifest.json'), path.join(buildDir, 'manifest.json'));

  const iconsSrc = path.join(rootDir, 'icons');
  const iconsDest = path.join(buildDir, 'icons');
  await copyDir(iconsSrc, iconsDest);

  const popupSrc = path.join(srcDir, 'popup');
  const popupDest = path.join(buildDir, 'popup');
  await mkdir(popupDest, { recursive: true });
  const files = await readdir(popupSrc);
  await Promise.all(
    files
      .filter((file) => file.endsWith('.html'))
      .map((file) => copyFile(path.join(popupSrc, file), path.join(popupDest, file)))
  );
}

async function copyDir(source: string, destination: string) {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    })
  );
}

async function buildTailwind() {
  const args = [
    'x',
    'tailwindcss',
    '-c',
    'tailwind.config.cjs',
    '-i',
    path.join('src', 'popup', 'tailwind.css'),
    '-o',
    path.join('build', 'tailwind.css'),
  ];

  if (isProduction) {
    args.push('--minify');
  }

  const proc = Bun.spawn(['bun', ...args], {
    cwd: rootDir,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error('Tailwind build failed');
  }
}

async function runBuild() {
  await copyStaticAssets();
  await buildTailwind();

  const popupEntryPoints = [
    'popup/popup.tsx',
    'popup/settings.tsx',
    'popup/order-history-page.tsx',
    'popup/price-alerts-page.tsx',
    'popup/portfolio-dashboard-page.tsx',
    'popup/limit-orders-page.tsx',
    'popup/risk-settings-page.tsx',
  ];
  const popupEntrypointsResolved = popupEntryPoints.map((entry) => path.join(srcDir, entry));
  const contentEntrypoint = path.join(srcDir, 'content/inject.tsx');
  const backgroundEntrypoint = path.join(srcDir, 'background/service-worker.ts');
  const allEntrypoints = [
    ...popupEntrypointsResolved,
    contentEntrypoint,
    backgroundEntrypoint,
  ];

  const baseOptions = {
    root: srcDir,
    outdir: buildDir,
    splitting: false,
    minify: isProduction,
    sourcemap: isProduction ? 'none' : 'inline',
    define,
    plugins: [aliasPlugin, runtimeShimPlugin(allEntrypoints)],
    target: 'browser',
    naming: {
      entry: '[dir]/[name].js',
    },
  } as const;

  const popupResult = await Bun.build({
    ...baseOptions,
    entrypoints: popupEntrypointsResolved,
    format: 'esm',
  });

  if (!popupResult.success) {
    throw new AggregateError(popupResult.logs, 'Popup build failed');
  }

  const contentResult = await Bun.build({
    ...baseOptions,
    entrypoints: [contentEntrypoint],
    format: 'iife',
  });

  if (!contentResult.success) {
    throw new AggregateError(contentResult.logs, 'Content script build failed');
  }

  const backgroundResult = await Bun.build({
    ...baseOptions,
    entrypoints: [backgroundEntrypoint],
    format: 'esm',
  });

  if (!backgroundResult.success) {
    throw new AggregateError(backgroundResult.logs, 'Service worker build failed');
  }
}

runBuild().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
