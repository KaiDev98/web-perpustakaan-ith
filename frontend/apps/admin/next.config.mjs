const api = process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001';
const config = {
  async rewrites() { return [{ source: '/api/v1/:path*', destination: `${api}/api/v1/:path*` }]; },
};
export default config;
