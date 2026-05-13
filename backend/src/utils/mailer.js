
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.email.host,        
  port: env.email.port,         
  
  // "secure: false" means we use STARTTLS not SSL.
  // Port 587 uses STARTTLS (upgrades to encrypted after connecting).
  // Port 465 uses SSL (encrypted from the start).
  // Ethereal uses port 587 so we set secure to false.
  secure: false,

  auth: {
    user: env.email.user,      
    pass: env.email.pass,      
  },
});


transporter.verify((error) => {
  if (error) {
    console.error(' Email transporter error:', error.message);
  } else {
    console.log(' Email transporter ready');
  }
});

export async function sendTransactionReceipt(data) {
  const {
    senderEmail,
    senderName,
    receiverEmail,
    receiverName,
    amount,
    transactionId,
    description,
    createdAt,
  } = data;

  // Format the amount with commas e.g. 10000 → "10,000.00"
  // Intl.NumberFormat is a built-in JavaScript formatter
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style:    'currency',
    currency: 'NGN',
  }).format(amount);

  // Format the date nicely e.g. "January 15, 2024 at 2:30 PM"
  const formattedDate = new Date(createdAt).toLocaleString('en-NG', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

    // ── Email to SENDER ────────────────────────────────────────
  const senderMail = {
    from:    env.email.from,
    to:      senderEmail,
    subject: `Debit Alert: ${formattedAmount} sent successfully`,


    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <div style="background: #1a1a2e; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">Fintech API</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #e74c3c;">Debit Alert</h2>
          
          <p>Hi <strong>${senderName}</strong>,</p>
          <p>Your transfer was successful. Here are the details:</p>

          <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; color: #666;">Amount Sent</td>
                <td style="padding: 10px; font-weight: bold; color: #e74c3c;">
                  ${formattedAmount}
                </td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; color: #666;">Recipient</td>
                <td style="padding: 10px; font-weight: bold;">${receiverName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666;">Description</td>
                <td style="padding: 10px;">${description || 'No description'}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; color: #666;">Date</td>
                <td style="padding: 10px;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666;">Transaction ID</td>
                <td style="padding: 10px; font-size: 12px; color: #999;">
                  ${transactionId}
                </td>
              </tr>
            </table>
          </div>

          <p style="color: #666; font-size: 14px;">
            If you did not authorize this transaction, 
            please contact support immediately.
          </p>
        </div>

        <div style="background: #1a1a2e; padding: 15px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © 2024 Fintech API. All rights reserved.
          </p>
        </div>

      </div>
    `,
  };

  // ── Email to RECEIVER ────────────────────────────────────────

  const receiverMail = {
    from:    env.email.from,
    to:      receiverEmail,
    subject: `Credit Alert: ${formattedAmount} received`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <div style="background: #1a1a2e; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">Fintech API</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #27ae60;">Credit Alert</h2>
          
          <p>Hi <strong>${receiverName}</strong>,</p>
          <p>You have received a transfer. Here are the details:</p>

          <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; color: #666;">Amount Received</td>
                <td style="padding: 10px; font-weight: bold; color: #27ae60;">
                  ${formattedAmount}
                </td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; color: #666;">Sender</td>
                <td style="padding: 10px; font-weight: bold;">${senderName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666;">Description</td>
                <td style="padding: 10px;">${description || 'No description'}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; color: #666;">Date</td>
                <td style="padding: 10px;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666;">Transaction ID</td>
                <td style="padding: 10px; font-size: 12px; color: #999;">
                  ${transactionId}
                </td>
              </tr>
            </table>
          </div>
        </div>

        <div style="background: #1a1a2e; padding: 15px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © 2024 Fintech API. All rights reserved.
          </p>
        </div>

      </div>
    `,
  };

  // Send both emails at the same time using Promise.all
  // WHY Promise.all?
  // If we send them sequentially:
  //   send sender email  → wait 2s
  //   send receiver email → wait 2s
  //   total: 4 seconds
  //
  // With Promise.all both send simultaneously:
  //   send both at same time → wait 2s
  //   total: 2 seconds
  const [senderInfo, receiverInfo] = await Promise.all([
    transporter.sendMail(senderMail),
    transporter.sendMail(receiverMail),
  ]);

  // nodemailer returns a "messageId" for each sent email
  // Log the Ethereal preview URLs so you can view the emails
  console.log(`📧 Sender receipt sent:   ${nodemailer.getTestMessageUrl(senderInfo)}`);
  console.log(`📧 Receiver receipt sent: ${nodemailer.getTestMessageUrl(receiverInfo)}`);

  return { senderInfo, receiverInfo };
}

// ─── SEND MONTHLY STATEMENT ───────────────────────────────────
// Sends a monthly account statement to a user
export async function sendMonthlyStatement(data) {
  const {
    userEmail,
    userName,
    month,
    year,
    totalCredits,
    totalDebits,
    closingBalance,
    transactionCount,
  } = data;

  const formattedCredits = new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN',
  }).format(totalCredits);

  const formattedDebits = new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN',
  }).format(totalDebits);

  const formattedBalance = new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN',
  }).format(closingBalance);

  // Month name e.g. "January 2024"
  const monthName = new Date(year, month - 1).toLocaleString('en-NG', {
    month: 'long',
    year:  'numeric',
  });

  const mail = {
    from:    env.email.from,
    to:      userEmail,
    subject: `Your ${monthName} Account Statement`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <div style="background: #1a1a2e; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">Fintech API</h1>
          <p style="color: #999; margin: 5px 0 0;">Monthly Statement</p>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1a1a2e;">${monthName} Statement</h2>
          
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Here is your account summary for ${monthName}:</p>

          <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; color: #666;">Total Credits</td>
                <td style="padding: 10px; font-weight: bold; color: #27ae60;">
                  + ${formattedCredits}
                </td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; color: #666;">Total Debits</td>
                <td style="padding: 10px; font-weight: bold; color: #e74c3c;">
                  - ${formattedDebits}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666;">Closing Balance</td>
                <td style="padding: 10px; font-weight: bold; font-size: 18px;">
                  ${formattedBalance}
                </td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; color: #666;">Total Transactions</td>
                <td style="padding: 10px;">${transactionCount}</td>
              </tr>
            </table>
          </div>

          <p style="color: #666; font-size: 14px;">
            Log in to your account to view detailed transaction history.
          </p>
        </div>

        <div style="background: #1a1a2e; padding: 15px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © 2024 Fintech API. All rights reserved.
          </p>
        </div>

      </div>
    `,
  };

  const info = await transporter.sendMail(mail);
  console.log(`📧 Monthly statement sent: ${nodemailer.getTestMessageUrl(info)}`);

  return info;
}