import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './openapi.json',
  output: {
    path: './api',
  },

  // RN-friendly HTTP layer
  client: 'fetch',

  // Generate TS types
  types: true,

  // Keep schemas as TS types (no runtime validation)
  schemas: 'types',

  // Nice-to-have output organization (if supported by your version)
  services: { asClass: false },
});
