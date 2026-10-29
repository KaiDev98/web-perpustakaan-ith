const api = process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001';
export default { async rewrites() { return [{ source: '/api/v1/:path*', destination: `${api}/api/v1/:path*` }]; } };
