import * as walletService from './wallet.service.js';
import asyncHandler from '../../utils/asynchandler.js';

export const getWallet = asyncHandler(async (req,res) => {
    const wallet = await walletService.getMywallet(req.user.userId);

    res.status(200).json({
        success: true,
        data: {wallet}
    })
})

