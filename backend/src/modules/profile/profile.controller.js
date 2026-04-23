import * as profileService from "./profile.service.js";
import asyncHandler from "../../utils/asynchandler.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await profileService.getMyProfile(req.user.userId);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await profileService.changePassword({
    userId: req.user.userId,
    currentPassword,
    newPassword,
  });

  res.status(200).json({
    success: true,
    message: "Password change successfully. Please log in again",
  });
});
