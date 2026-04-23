import bcrypt from "bcryptjs";
import prisma from "../../utils/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { env } from "../../config/env.js";


export async function getMyProfile(userId) {
    const user = await prisma.user.findUnique({
        where: {id : userId},
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            wallet: {
                select: {
                    id: true,
                    balance: true
                },
            }
        }
    })
    if(!user){
     throw new ApiError(404, 'User not found')
    }

    return user;
}

export async function changePassword({userId, currentPassword , newPassword}) {
    const user = await prisma.user.findUnique({
        where: {id: userId}
    });

    if(!user) {
        throw new ApiError(404, 'user not found')
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if(!passwordMatch) {
        throw new ApiError(401, 'Current password is incorrect')
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if(isSamePassword) {
        throw new ApiError(400, 'New password must be different for current password')
    }

    const hashedNewPassowrd = await bcrypt.hash(newPassword, env.bcryptRounds);

    await prisma.user.update({
        where: {id: userId},
        data: {password: hashedNewPassowrd}
    })

    await prisma.refreshToken.updateMany({
        where: {
            userId,
            revoked: false,
        },
        data: { revoked: true}
    })
}
