import nextVitals from 'eslint-config-next/core-web-vitals';
export default [
  ...nextVitals,
  { ignores: ['**/.next/**', '**/node_modules/**'], rules: { '@next/next/no-html-link-for-pages': 'off' } },
];
