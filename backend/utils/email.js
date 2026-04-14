const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'Rupalsha <onboarding@resend.dev>';

const emailWrapper = (content) => `
  <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #F9F7F3; padding: 40px;">
    <h1 style="color: #1F3A2F; text-align: center; font-size: 28px; margin-bottom: 0;">Rupalsha</h1>
    <p style="text-align: center; color: #C8A951; font-size: 12px; margin-top: 4px;">Where Comfort Meets Style</p>
    <hr style="border: 1px solid #E8DCCB;" />
    ${content}
    <hr style="border: 1px solid #E8DCCB; margin-top: 30px;" />
    <p style="color: #888; text-align: center; font-size: 11px; margin-top: 16px;">
      © ${new Date().getFullYear()} Rupalsha. All rights reserved.<br/>
      If you have questions, reply to this email or contact us at rupalshaofficial@gmail.com
    </p>
  </div>
`;

// ===== ORDER EMAILS =====

const sendOrderConfirmation = async (order, userEmail) => {
  try {
    const itemsList = order.items
      .map(item => `<li style="padding: 4px 0;">${item.name} (${item.size}) × ${item.quantity} — ₹${item.price}</li>`)
      .join('');

    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Order Confirmed - ${order.orderNumber}`,
      html: emailWrapper(`
        <h2 style="color: #1F3A2F;">Thank you for your order! 🎉</h2>
        <p style="color: #2B2B2B;">Your order has been placed successfully.</p>
        <table style="width: 100%; color: #2B2B2B; font-size: 14px;">
          <tr><td style="padding: 6px 0;"><strong>Order Number:</strong></td><td>${order.orderNumber}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Payment:</strong></td><td>${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</td></tr>
        </table>
        <h3 style="color: #2B2B2B; margin-top: 20px;">Items Ordered:</h3>
        <ul style="color: #2B2B2B; padding-left: 20px;">${itemsList}</ul>
        <div style="background: #1F3A2F; color: white; padding: 16px; border-radius: 8px; text-align: center; margin-top: 20px;">
          <span style="font-size: 14px;">Total Amount</span><br/>
          <span style="font-size: 24px; font-weight: bold;">₹${order.totalAmount}</span>
        </div>
        <p style="color: #888; margin-top: 16px; font-size: 13px;">We'll notify you when your order status changes.</p>
      `),
    });
  } catch (error) {
    console.error('Order confirmation email error:', error.message);
  }
};

const sendOrderStatusUpdate = async (order, userEmail) => {
  try {
    const statusMessages = {
      confirmed: { emoji: '✅', title: 'Order Confirmed', message: 'Your order has been confirmed and is being prepared.' },
      processing: { emoji: '📦', title: 'Order Processing', message: 'Your order is being packed and will be shipped soon.' },
      shipped: { emoji: '🚚', title: 'Order Shipped', message: `Your order is on its way!${order.trackingNumber ? ` Tracking Number: <strong>${order.trackingNumber}</strong>` : ''}` },
      delivered: { emoji: '🎉', title: 'Order Delivered', message: 'Your order has been delivered. We hope you love it!' },
      cancelled: { emoji: '❌', title: 'Order Cancelled', message: 'Your order has been cancelled. If you were charged, a refund will be processed shortly.' },
      returned: { emoji: '↩️', title: 'Return Processed', message: 'Your return has been processed. Refund will be initiated shortly.' },
    };

    const info = statusMessages[order.status] || { emoji: '📋', title: 'Order Update', message: `Your order status has been updated to: ${order.status}` };

    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `${info.emoji} ${info.title} - ${order.orderNumber}`,
      html: emailWrapper(`
        <div style="text-align: center; padding: 20px 0;">
          <span style="font-size: 48px;">${info.emoji}</span>
          <h2 style="color: #1F3A2F; margin-top: 12px;">${info.title}</h2>
        </div>
        <p style="color: #2B2B2B; text-align: center; font-size: 16px;">${info.message}</p>
        <table style="width: 100%; color: #2B2B2B; font-size: 14px; margin-top: 20px;">
          <tr><td style="padding: 6px 0;"><strong>Order Number:</strong></td><td>${order.orderNumber}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Status:</strong></td><td style="text-transform: capitalize;">${order.status}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Total:</strong></td><td>₹${order.totalAmount}</td></tr>
        </table>
        ${order.notes ? `<p style="color: #888; margin-top: 16px; font-size: 13px;"><strong>Note:</strong> ${order.notes}</p>` : ''}
      `),
    });
  } catch (error) {
    console.error('Order status email error:', error.message);
  }
};

const sendOrderCancellation = async (order, userEmail, reason) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Order Cancelled - ${order.orderNumber}`,
      html: emailWrapper(`
        <div style="text-align: center; padding: 20px 0;">
          <span style="font-size: 48px;">❌</span>
          <h2 style="color: #1F3A2F; margin-top: 12px;">Order Cancelled</h2>
        </div>
        <p style="color: #2B2B2B;">Your order <strong>${order.orderNumber}</strong> has been cancelled as per your request.</p>
        <p style="color: #2B2B2B;"><strong>Reason:</strong> ${reason}</p>
        <p style="color: #2B2B2B;"><strong>Amount:</strong> ₹${order.totalAmount}</p>
        ${order.isPaid ? '<p style="color: #1F3A2F; font-weight: bold;">Your refund will be processed within 5-7 business days.</p>' : ''}
      `),
    });
  } catch (error) {
    console.error('Order cancellation email error:', error.message);
  }
};

const sendReturnConfirmation = async (order, userEmail, reason) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Return Requested - ${order.orderNumber}`,
      html: emailWrapper(`
        <div style="text-align: center; padding: 20px 0;">
          <span style="font-size: 48px;">↩️</span>
          <h2 style="color: #1F3A2F; margin-top: 12px;">Return Request Received</h2>
        </div>
        <p style="color: #2B2B2B;">We've received your return request for order <strong>${order.orderNumber}</strong>.</p>
        <p style="color: #2B2B2B;"><strong>Reason:</strong> ${reason}</p>
        <p style="color: #2B2B2B;">Our team will review your request and get back to you shortly. Refund will be processed once the return is approved.</p>
      `),
    });
  } catch (error) {
    console.error('Return confirmation email error:', error.message);
  }
};

// ===== AUTH EMAILS =====

const sendWelcomeEmail = async (name, email) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Rupalsha! 🎉',
      html: emailWrapper(`
        <div style="text-align: center; padding: 20px 0;">
          <span style="font-size: 48px;">👋</span>
          <h2 style="color: #1F3A2F; margin-top: 12px;">Welcome, ${name}!</h2>
        </div>
        <p style="color: #2B2B2B; text-align: center; font-size: 16px;">Thank you for joining Rupalsha. We're thrilled to have you!</p>
        <p style="color: #2B2B2B; text-align: center;">Discover our exquisite collection of ethnic and modern fashion, curated just for you.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${process.env.FRONTEND_URL}/products" style="display: inline-block; background: #1F3A2F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Shopping</a>
        </div>
      `),
    });
  } catch (error) {
    console.error('Welcome email error:', error.message);
  }
};

const sendPasswordReset = async (email, resetUrl) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Password Reset - Rupalsha',
      html: emailWrapper(`
        <div style="text-align: center; padding: 20px 0;">
          <span style="font-size: 48px;">🔐</span>
          <h2 style="color: #1F3A2F; margin-top: 12px;">Password Reset</h2>
        </div>
        <p style="color: #2B2B2B;">You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #1F3A2F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #888; font-size: 13px;">This link expires in 10 minutes. If you didn't request this, please ignore this email.</p>
      `),
    });
  } catch (error) {
    console.error('Password reset email error:', error.message);
  }
};

const sendPasswordChangeConfirmation = async (name, email) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: '🔒 Password Changed - Rupalsha',
      html: emailWrapper(`
        <div style="text-align: center; padding: 20px 0;">
          <span style="font-size: 48px;">🔒</span>
          <h2 style="color: #1F3A2F; margin-top: 12px;">Password Changed</h2>
        </div>
        <p style="color: #2B2B2B;">Hi ${name},</p>
        <p style="color: #2B2B2B;">Your password has been changed successfully. If you did not make this change, please contact us immediately.</p>
      `),
    });
  } catch (error) {
    console.error('Password change email error:', error.message);
  }
};

// ===== CONTACT EMAILS =====

const sendContactConfirmation = async (name, email, subject) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `We received your message - "${subject}"`,
      html: emailWrapper(`
        <h2 style="color: #1F3A2F;">Message Received</h2>
        <p style="color: #2B2B2B;">Hi ${name},</p>
        <p style="color: #2B2B2B;">Thank you for reaching out! We've received your message regarding "<strong>${subject}</strong>" and our team will get back to you within 24-48 hours.</p>
      `),
    });
  } catch (error) {
    console.error('Contact confirmation email error:', error.message);
  }
};

const sendContactNotificationToAdmin = async (name, email, subject, message) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'rupalshaofficial@gmail.com';
    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `📩 New Contact: ${subject}`,
      html: emailWrapper(`
        <h2 style="color: #1F3A2F;">New Contact Form Submission</h2>
        <table style="width: 100%; color: #2B2B2B; font-size: 14px;">
          <tr><td style="padding: 8px 0; font-weight: bold;">From:</td><td>${name}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td>${email}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Subject:</td><td>${subject}</td></tr>
        </table>
        <div style="background: white; padding: 16px; border-radius: 8px; margin-top: 16px; border-left: 4px solid #C8A951;">
          <p style="color: #2B2B2B; white-space: pre-line;">${message}</p>
        </div>
      `),
    });
  } catch (error) {
    console.error('Admin notification email error:', error.message);
  }
};

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendOrderCancellation,
  sendReturnConfirmation,
  sendWelcomeEmail,
  sendPasswordReset,
  sendPasswordChangeConfirmation,
  sendContactConfirmation,
  sendContactNotificationToAdmin,
};
