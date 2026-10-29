export type Mode = 'development' | 'test' | 'production';
export const adminCookieName = (mode: Mode) => mode === 'production' ? '__Host-ith_admin' : 'ith_admin';
export const csrfCookieName = (mode: Mode) => mode === 'production' ? '__Host-ith_csrf' : 'ith_csrf';
export const cookieOptions = (mode: Mode, httpOnly: boolean) => ({
  httpOnly, secure: mode === 'production', sameSite: 'lax' as const, path: '/',
});
