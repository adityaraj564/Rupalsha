const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendOrderConfirmation = async (order, userEmail) => {
  try {
    const transporter = createTransporter();
    const itemsList = order.items
      .map(item => `<li>${item.name} (${item.size}) × ${item.quantity} — ₹${item.price}</li>`)
      .join('');

    await transporter.sendMail({
      from: `"Rupalsha" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Order Confirmed - ${order.orderNumber}`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #F9F7F3; padding: 40px;">
          <h1 style="color: #1F3A2F; text-align: center; font-size: 28px;">Rupalsha</h1>
          <hr style="border: 1px solid #E8DCCB;" />
          <h2 style="color: #2B2B2B;">Thank you for your order!</h2>
          <p style="color: #2B2B2B;">Order Number: <strong>${order.orderNumber}</strong></p>
          <ul style="color: #2B2B2B;">${itemsList}</ul>
          <p style="color: #2B2B2B; font-size: 18px;"><strong>Total: ₹${order.totalAmount}</strong></p>
          <p style="color: #2B2B2B;">Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
          <hr style="border: 1px solid #E8DCCB;" />
          <p style="color: #888; text-align: center; font-size: 12px;">Rupalsha — Where Comfort Meets Style</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Email send error:', error.message);
  }
};

const sendPasswordReset = async (email, resetUrl) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Rupalsha" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset - Rupalsha',
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #F9F7F3; padding: 40px;">
          <h1 style="color: #1F3A2F; text-align: center;">Rupalsha</h1>
          <hr style="border: 1px solid #E8DCCB;" />
          <p style="color: #2B2B2B;">You requested a password reset. Click the link below:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #1F3A2F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
          <p style="color: #888; margin-top: 20px;">This link expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Email send error:', error.message);
  }
};

module.exports = { sendOrderConfirmation, sendPasswordReset };
