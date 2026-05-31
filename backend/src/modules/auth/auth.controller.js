import * as authService from "./auth.service.js";
import asyncHandler from "../../utils/asynchandler.js";
import { success } from "zod";
import {
  clearCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookies.js";
import logger from "../../config/logger.js";

export const register = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.registerUser(req.body);

  // Set the refresh token as an httpOnly cookie.
  // The client NEVER sees this token in JavaScript — the browser
  // manages it automatically and sends it with every request.
  // 'refreshToken' is the cookie NAME — the browser stores it under this key.
  res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);

  // Set the refresh token as an httpOnly cookie.
  // The client NEVER sees this token in JavaScript — the browser
  // manages it automatically and sends it with every request.
  // 'refreshToken' is the cookie NAME — the browser stores it under this key.

  req.session.user = {
    userId: user.id,
    email: user.email,
  };
  
  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user, accessToken: tokens.accessToken },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.loginUser(req.body);

  res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);

  req.session.user = {
    userId: user.id,
    email: user.email,
  };

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user, accessToken: tokens.accessToken },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await authService.logoutUser({ refreshToken });
  }
  res.clearCookie("refreshToken", clearCookieOptions);

  // Destroy the session in PostgreSQL and clear the session cookie.
  // req.session.destroy() removes the session row from the sessions table.
  req.session.destroy((err) => {
    if (err) {
      logger.error("Session destroy error:", err);
    }
  });

  res.status(200).json({
    success: true,
    message: "logged out successfully",
  });
});

export const refresh = asyncHandler(async (req, res) => {
const refreshToken = req.cookies.refreshToken;

if(!refreshToken) {
    return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
    });
}

const { tokens } = await authService.refreshToken({ refreshToken})
  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: { accessToken: tokens.accessToken },
  });
});
