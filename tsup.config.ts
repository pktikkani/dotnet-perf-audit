import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'bin/cli.ts',
  },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  // Don't bundle dependencies — let Node resolve them from node_modules
  // This avoids CJS/ESM interop issues with packages like commander
  treeshake: true,
});
