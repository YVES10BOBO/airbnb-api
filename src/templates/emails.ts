const BRAND_COLOR = "#FF5A5F";

const base = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:${BRAND_COLOR};padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Airbnb</h1>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:16px 32px;background:#f1f1f1;text-align:center;font-size:12px;color:#999;">
      © ${new Date().getFullYear()} Airbnb Clone · All rights reserved
    </div>
  </div>
</body>
</html>`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;">${label}</a>`;

export function welcomeEmail(name: string, role: string): string {
  const roleMessage =
    role === "HOST"
      ? `<p>Ready to share your space? Create your first listing and start welcoming guests from around the world.</p>
         ${btn("http://localhost:3000/listings", "Create Your First Listing")}`
      : `<p>Your next adventure is waiting. Explore thousands of unique places to stay.</p>
         ${btn("http://localhost:3000/listings", "Explore Listings")}`;

  return base(`
    <h2 style="color:#333;">Welcome, ${name}! 🎉</h2>
    <p style="color:#555;line-height:1.6;">Thanks for joining Airbnb. We're excited to have you as a ${role.toLowerCase()}.</p>
    ${roleMessage}
  `);
}

export function bookingConfirmationEmail(
  guestName: string,
  listingTitle: string,
  location: string,
  checkIn: string,
  checkOut: string,
  totalPrice: number
): string {
  return base(`
    <h2 style="color:#333;">Booking Confirmed! ✅</h2>
    <p style="color:#555;">Hi ${guestName}, your booking is confirmed. Here are your details:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:10px;font-weight:bold;color:#555;">Property</td><td style="padding:10px;color:#333;">${listingTitle}</td></tr>
      <tr><td style="padding:10px;font-weight:bold;color:#555;">Location</td><td style="padding:10px;color:#333;">${location}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:10px;font-weight:bold;color:#555;">Check-in</td><td style="padding:10px;color:#333;">${checkIn}</td></tr>
      <tr><td style="padding:10px;font-weight:bold;color:#555;">Check-out</td><td style="padding:10px;color:#333;">${checkOut}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:10px;font-weight:bold;color:#555;">Total Price</td><td style="padding:10px;color:${BRAND_COLOR};font-weight:bold;">$${totalPrice.toFixed(2)}</td></tr>
    </table>
    <p style="color:#888;font-size:13px;">Cancellations made at least 48 hours before check-in are fully refunded.</p>
  `);
}

export function bookingCancellationEmail(
  guestName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string
): string {
  return base(`
    <h2 style="color:#333;">Booking Cancelled</h2>
    <p style="color:#555;">Hi ${guestName}, your booking has been cancelled.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:10px;font-weight:bold;color:#555;">Property</td><td style="padding:10px;color:#333;">${listingTitle}</td></tr>
      <tr><td style="padding:10px;font-weight:bold;color:#555;">Check-in</td><td style="padding:10px;color:#333;">${checkIn}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:10px;font-weight:bold;color:#555;">Check-out</td><td style="padding:10px;color:#333;">${checkOut}</td></tr>
    </table>
    <p style="color:#555;">Looking for another place to stay?</p>
    ${btn("http://localhost:3000/listings", "Explore Listings")}
  `);
}

export function passwordResetEmail(name: string, resetLink: string): string {
  return base(`
    <h2 style="color:#333;">Reset Your Password</h2>
    <p style="color:#555;">Hi ${name}, we received a request to reset your password.</p>
    <p style="color:#555;">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    ${btn(resetLink, "Reset Password")}
    <p style="margin-top:24px;color:#999;font-size:13px;">If you did not request a password reset, you can safely ignore this email.</p>
  `);
}
