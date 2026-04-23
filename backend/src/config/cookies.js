import { env } from "./env.js";

  // sameSite: 'strict' means the cookie is only sent when the request
    // comes from the SAME site — blocks CSRF attacks.
    // CSRF = Cross Site Request Forgery — attacker tricks your browser
    // into making a request to your bank using your session.
export const refreshTokenCookieOptions = {

    httpOnly: true,

    secure: env.nodeEnv === 'production',

    sameSite: 'strict',

    maxAge: 7 * 24 * 60 * 60 * 1000,

    path:'/',
};

export const clearCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/',
};


