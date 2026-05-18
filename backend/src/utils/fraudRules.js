import prisma from './prisma.js';

// ─── RULE 1: VELOCITY CHECK ───────────────────────────────────
// Flags if a wallet makes more than 5 transfers in 10 minutes.
// This pattern indicates automated attacks or account takeover.
export async function velocityCheck({walletId, transactionId}) {
 
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const recentTransferCount = await prisma.transaction.count({
        where: {
            senderWalletId: walletId,
            type: 'TRANSFER',
            createdAt: { gte: tenMinutesAgo},
        },
    });

    if(recentTransferCount > 5) {
        return  {
            rule: 'VELOCITY_CHECK',
            reason: `${recentTransferCount} transfers in last 10 mintues`,
            severity: 'HIGH',
        }
    }
    return null;
}

// ─── RULE 2: LARGE AMOUNT CHECK ──────────────────────────────
// Flags transfers above ₦500,000.
// Large amounts need extra scrutiny in real banking.
export async function largeAmountCheck({ amount}) {
const LARGE_AMOUNT_THRESHOLD = 500000;

if(Number(amount) > LARGE_AMOUNT_THRESHOLD) {
    return {
        rule: 'LARGE_AMOUN_CHECK',
        reason: `Transfer amount ${amount} exceeds threshold of ${LARGE_AMOUNT_THRESHOLD}`,
        severity: 'MEDIUM'
    }
}

return null;
}

// ─── RULE 3: RAPID DRAIN CHECK ────────────────────────────────
// Flags if a transfer sends more than 80% of the wallet balance.
// Signals an account being drained — common in fraud scenarios.
export async function rapidDrainCheck({walletId, amount}) {
 const wallet = await prisma.wallet.findUnique({
    where: {id: walletId},
    select: { balance: true}
 })

 if(!wallet) return null;

 const balance = Number(wallet.balance)
 const transferAmount = Number(amount)

 const percentage = (transferAmount / balance) * 100;

 if(percentage > 80 ) {
    return{
        rule: 'RAPID_DRAIN_CHECK',
       reason: `Transfer is ${percentage.toFixed(1)}%. of wallet balance`,
       severity: 'MEDIUM'
    }
 }
 return null
}

export async function nightTransferCheck({amount}) {

    const NIGHT_AMOUNT_THRESHOLD = 50000

    if(Number(amount) >  NIGHT_AMOUNT_THRESHOLD) return null;

    const currentHour = new Date().getHours();

    if(currentHour >= 0 && currentHour < 4 ) {
        return {
            rule: 'NIGHT_TRANSFER_CHECK',
            reason: `Large transfer of ${amount} made at ${currentHour}:00am`,
            severity: 'LOW'
        }
    };

    return null ;
}


// ─── RUN ALL RULES ────────────────────────────────────────────
// Runs all rules against a transaction and returns all alerts found.
// Returns an empty array if no fraud detected.
export async function runFraudChecks({ walletId, transactionId, amount}) {
  const results = await Promise.all([
    velocityCheck({ walletId, transactionId}),
    largeAmountCheck({ amount}),
    rapidDrainCheck({ walletId, amount }),
    nightTransferCheck({amount})
  ]);

  const alerts = results.filter((result) => result != null);

  return alerts;
}