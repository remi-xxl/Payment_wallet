import bcrypt from "bcryptjs";
import prisma from "../../utils/prisma.js";
import {
  generateRefreshToken,
  generateAccessToken,
  hashToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import ApiError from "../../utils/ApiError.js";
import { generateNUBAN } from "../../utils/nuban.js";
import { env } from "../../config/env.js";

export async function registerUser({ email, password, firstName, lastName }) {
  const exisitingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (exisitingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(password, env.bcryptRounds);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });
   const wallet = await tx.wallet.create({
    data: {
      userId: newUser.id,

      accountNumber: 'PENDING'
    }, select: {
      id: true,
      serialNumber: true
    },
   });
    const accountNumber = generateNUBAN(wallet.serialNumber);

    await tx.wallet.update({
      where: { id: wallet.id},
      data: { accountNumber}
    });
    
    return newUser;
  });

  const payload = { userId: user.id, email: user.email };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await saveRefreshToken(user.id, refreshToken);

  return {
    user,
    tokens: { accessToken, refreshToken },
  };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      password: true,
    },
  });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const comparePassword = await bcrypt.compare(password, user.password);
  if (!comparePassword) {
    throw new ApiError(401, "Invalid email or password");
  }

  const payload = { userId: user.id, email: user.email };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await saveRefreshToken(user.id, refreshToken);

  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens: { accessToken, refreshToken },
  };
}

export async function logoutUser({ refreshToken }) {
    
    // Hash the incoming token to match what we stored
  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });

    // If the token does not exist or is already revoked, just return.
  // We do not throw an error here — if someone logs out twice,
  // the result is the same: they are logged out. No need to complain.
  if (!storedToken || storedToken.revoked) {
    return;
  }

  await prisma.refreshToken.update({
    where: { token: tokenHash },
    data: { revoked: true },
  });
}

export async function refreshToken({ refreshToken }) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new ApiError(401, "invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });

  if (!storedToken) {
    throw new ApiError(401, "Refresh token not found");
  }
  if (storedToken.revoked) {
    throw new ApiError(401, "Refresh token not found");
  }
  if (storedToken.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token has expired");
  }
  // STEP 3: ROTATE the token
  // Rotation means we invalidate the OLD token and issue a BRAND NEW one.
  // WHY?
  // If an attacker steals a refresh token, they can only use it ONCE.
  // The moment the real user makes any request, the old token is revoked
  // and the attacker's copy becomes useless.

  await prisma.refreshToken.update({
    where: { token: tokenHash },
    data: { revoked: true },
  });

  // STEP 3: ROTATE the token
  // Rotation means we invalidate the OLD token and issue a BRAND NEW one.
  // WHY?
  // If an attacker steals a refresh token, they can only use it ONCE.
  // The moment the real user makes any request, the old token is revoked
  // and the attacker's copy becomes useless.
  const payload = { userId: decoded.userId, email: decoded.email };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  await saveRefreshToken(decoded.userId, newRefreshToken);

  return {
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  };
}

async function saveRefreshToken(userId, refreshToken) {
  const tokenHash = hashToken(refreshToken);

  // Delete any existing refresh tokens for this user
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });

  // Calculate the expiry date from the string "7d"
  // We need to store it as an actual Date so we can compare it later
  const days = parseInt(env.jwt.refreshExpiresIn);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt,
    },
  });
}



