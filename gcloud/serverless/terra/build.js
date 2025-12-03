const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/index.js',
  external: ['@google-cloud/functions-framework'], // functions-framework is provided by the runtime or installed
}).catch(() => process.exit(1));
