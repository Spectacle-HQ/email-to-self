import { readFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

/**
 * Minify the contents of any template literal preceded by a `/* css *\/`
 * comment. Lets us keep `src/core/styles.ts` readable while shipping a tight
 * CSS payload in the bundle.
 */
const cssMinifyPlugin = {
  name: 'css-template-minify',
  setup(build: {
    onLoad: (
      opts: { filter: RegExp },
      fn: (args: { path: string }) => Promise<{ contents: string; loader: 'ts' }>,
    ) => void;
  }) {
    build.onLoad({ filter: /styles\.ts$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8');
      const minified = source.replace(/\/\* css \*\/\s*`([\s\S]*?)`/g, (_full, css: string) => {
        const compact = css
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\s+/g, ' ')
          .replace(/\s*([{}:;,>])\s*/g, '$1')
          .replace(/;}/g, '}')
          .trim();
        return '`' + compact + '`';
      });
      return { contents: minified, loader: 'ts' };
    });
  },
};

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      react: 'src/react/index.tsx',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
    external: ['react'],
    minify: false,
    esbuildPlugins: [cssMinifyPlugin],
  },
  {
    entry: { 'email-to-self.iife': 'src/iife.ts' },
    format: ['iife'],
    globalName: 'EmailToSelf',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
    treeshake: true,
    // ES2022 = native private fields. Both iOS WKWebView (14.5+) and Android
    // WebView (Chromium 90+) support this; the bundle is ~2 KB smaller without
    // the WeakMap-based private-field polyfill.
    target: 'es2022',
    minify: true,
    dts: false,
    clean: false,
    esbuildPlugins: [cssMinifyPlugin],
  },
]);
