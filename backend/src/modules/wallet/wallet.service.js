import prisma from '../../utils/prisma.js'
import ApiError from '../../utils/ApiError.js';
import { withCache, CacheKeys, CacheTTL } from '../../utils/cache.js';

export async function getMyWallet(userId) {

  return withCache(
    CacheKeys.wallet(userId),  
    CacheTTL.wallet,           
    async () => {              

      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: {
          id:            true,
          accountNumber: true,
          balance:       true,
          createdAt:     true,
          user: {
            select: {
              firstName: true,
              lastName:  true,
              email:     true,
            },
          },
        },
      });

      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }

      return {
        ...wallet,
        accountNumber: wallet.accountNumber.toString(),
      };
    }
  );
}