import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: { target: '../api/openapi.json' },
    output: {
      mode: 'tags-split',
      target: 'src/lib/api/generated/endpoints',
      schemas: 'src/lib/api/generated/models',
      client: 'fetch',
      clean: true,
      mock: false,
      override: {
        mutator: {
          path: 'src/lib/api/http-client.ts',
          name: 'httpClient',
        },
      },
    },
  },
  zod: {
    input: { target: '../api/openapi.json' },
    output: {
      mode: 'single',
      target: 'src/lib/api/generated/zod.ts',
      client: 'zod',
    },
  },
});
