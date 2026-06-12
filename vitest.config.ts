import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Pure/unit-testable lib modules. The remaining lib files are browser
      // (canvas/IndexedDB/Supabase) or Next.js runtime wiring exercised by
      // the framework — not meaningfully unit-testable in node.
      include: [
        'lib/similarity.ts',
        'lib/upcitemdb.ts',
        'lib/db.ts',
        'lib/embedding.ts',
        'lib/bg-removal.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
