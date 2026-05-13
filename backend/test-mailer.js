
import { sendTransactionReceipt } from './src/utils/mailer.js';

const result = await sendTransactionReceipt({
  senderEmail:   'john@gmail.com',
  senderName:    'John Doe',
  receiverEmail: 'jane@gmail.com',
  receiverName:  'Jane Doe',
  amount:        500,
  transactionId: 'clx123abc',
  description:   'For lunch',
  createdAt:     new Date(),
});

console.log('Done!');