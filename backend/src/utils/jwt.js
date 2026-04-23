import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import crypto from 'crypto'

export function generateAccessToken(payload) {
    return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn})
}

export function generateRefreshToken(payload) {
    return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn})
}

export function verifyAccessToken(token) {
    return jwt.verify(token, env.jwt.accessSecret)
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, env.jwt.refreshSecret)
}

// We hash the refresh token before storing it in the database.
// SHA-256 is a fast one-way hash — fast because we do this on
// every request, one-way because it cannot be reversed.
// Even if the database is stolen, the attacker cannot use a hash
// as an actual token — it is useless without the original string.
export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
