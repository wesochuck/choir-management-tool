/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  
  if (users.otp) {
    users.otp.enabled = true;
    users.otp.duration = 1800; // 30 minutes in seconds
    users.otp.length = 6;
    users.otp.emailTemplate = {
      subject: "Login Code for {APP_NAME}",
      body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px; background-color: #FFFFFF;">
  <h2 style="font-size: 20px; font-weight: 700; color: #1F2937; margin-top: 0; margin-bottom: 16px;">One-Time Login Code</h2>
  <p style="font-size: 15px; line-height: 24px; color: #4B5563; margin-top: 0; margin-bottom: 24px;">To access your account on the <strong>{APP_NAME}</strong> Singer Portal, please enter the following 6-digit verification code. This code is active for <strong>30 minutes</strong>.</p>
  
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #6D28D9; background-color: #F5F3FF; padding: 12px 32px; border-radius: 8px; border: 1px solid #DDD6FE; font-family: monospace;">{OTP}</span>
  </div>
  
  <p style="font-size: 13px; line-height: 20px; color: #9CA3AF; margin-top: 0; margin-bottom: 24px; text-align: center;"><em>This is a one-time code. If you did not request this login code, you can safely ignore this email.</em></p>
  
  <hr style="border: 0; border-top: 1px solid #E5E7EB; margin-bottom: 16px;" />
  
  <p style="font-size: 12px; color: #9CA3AF; margin: 0; text-align: center;">Sent by the {APP_NAME} Team</p>
</div>`
    };
  }

  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  
  if (users.otp) {
    users.otp.enabled = false;
    users.otp.duration = 180;
    users.otp.length = 8;
    users.otp.emailTemplate = {
      subject: "OTP for {APP_NAME}",
      body: `<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>`
    };
  }

  app.save(users);
});
