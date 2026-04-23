import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "./env.js";

//connectPgSimple needs the session object to extend it.
// This creates a PostgreSQL session store class.
// WHY store sessions in PostgreSQL?
// By default express-session stores sessions IN MEMORY.
// This means every time you restart the server, all sessions are lost
// and every user is logged out. Also memory fills up with millions of sessions.
// Storing in PostgreSQL means sessions survive restarts and scale properly.

const pgSession = connectPgSimple(session);

export const sesssionMiddleware = session({
  store: new pgSession({
    conString: env.database,

    // The table name where sessions are stored.
    // connect-pg-simple will CREATE this table automatically.

    tableName: "session",

     createTableIfMissing: true,
    // How often to delete expired sessions from the database (in seconds).
    // 86400 = once per day

    pruneSessionInterval: 86400,
  }),

  // The table name where sessions are stored.
  // connect-pg-simple will CREATE this table automatically.
  secret: env.sessionSecret,

  resave: false, // Don't save session if unmodified

  // saveUninitialized: false means do not create a session for a user
  // who has not logged in yet. Saves space in the database.
  saveUninitialized: false,

  cookie: {
    // sameSite: 'strict' means the cookie is only sent when the request
    // comes from the SAME site — blocks CSRF attacks.
    // CSRF = Cross Site Request Forgery — attacker tricks your browser
    // into making a request to your bank using your session.
    httpOnly: true,
    secure: env.nodeEnv === "production",

    // sameSite: 'strict' means the cookie is only sent when the request
    // comes from the SAME site — blocks CSRF attacks.
    // CSRF = Cross Site Request Forgery — attacker tricks your browser
    // into making a request to your bank using your session.
    sameSite: "strict",

    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
