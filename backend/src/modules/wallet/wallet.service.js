import prisma from "../../utils/prisma.js";
import ApiError from "../../utils/ApiError.js";


export async function getMywallet(userId) {
    const  wallet = await prisma.wallet.findUnique({
        where: {userId},
        select: {
            id: true,
            balance: true,
            createdAt: true,
            user: {
                select: {
                    firstName: true,
                    lastName:true,
                    email: true
                }
            }
        }
    });
    if(!wallet) {
        throw new ApiError(404, 'Wallet not found')
    }

    return wallet;

}