type InviteParams = {
    inviteeName: string;
    organizationName: string;
    inviterName: string;
    inviteUrl: string;
};

function invite({ inviteeName, organizationName, inviterName, inviteUrl }: InviteParams) {
    const subject = `You've been invited to ${organizationName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="padding: 32px 40px; border-bottom: 1px solid #eee;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #111;">You're invited to ${organizationName}</h1>
        </div>
        <div style="padding: 32px 40px;">
            <p style="margin: 0 0 16px; font-size: 15px; color: #333; line-height: 1.5;">
                Hi${inviteeName ? ` ${inviteeName}` : ""},
            </p>
            <p style="margin: 0 0 16px; font-size: 15px; color: #333; line-height: 1.5;">
                <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on OpenCRM.
            </p>
            <p style="margin: 0 0 24px; font-size: 15px; color: #333; line-height: 1.5;">
                Click the button below to create your account and join the team.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #111; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
                Accept invitation
            </a>
            <p style="margin: 24px 0 0; font-size: 13px; color: #888; line-height: 1.5;">
                This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>`.trim();

    const text = `Hi${inviteeName ? ` ${inviteeName}` : ""},\n\n${inviterName} has invited you to join ${organizationName} on OpenCRM.\n\nAccept the invitation: ${inviteUrl}\n\nThis invitation expires in 7 days. If you didn't expect this, you can ignore this email.`;

    return { subject, html, text };
}

function verificationCode({ code }: { code: string }) {
    const subject = `Your verification code: ${code}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="padding: 32px 40px;">
            <p style="margin: 0 0 16px; font-size: 15px; color: #333; line-height: 1.5;">
                Your verification code is:
            </p>
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 16px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111;">${code}</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #888; line-height: 1.5;">
                This code expires in 10 minutes. If you didn't request this, you can ignore this email.
            </p>
        </div>
    </div>
</body>
</html>`.trim();

    const text = `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`;

    return { subject, html, text };
}

export const templates = {
    invite,
    verificationCode,
};
