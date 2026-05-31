import * as TransactionService from "./transaction.service.js";
import asyncHandler from "../../utils/asynchandler.js";


export const transfer = asyncHandler(async (req, res) => {
  const { recipientEmail, accountNumber, amount, description } = req.body;

  const transaction = await TransactionService.transfer({
    senderUserid: req.user.userId,
    recipientEmail,
    accountNumber,
    amount,
    description,
  });

  res.status(200).json({
    success: true,
    message: "Transfer successful",
    data: { transaction },
  });
});

export const getTransactionHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.validated;

  const result = await TransactionService.getTransactionHistory({
    userId: req.user.userId,

    // Convert to numbers with defaults if not provided
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});
