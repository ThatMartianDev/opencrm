import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

type SendEmailOptions = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
    const from = process.env.SMTP_FROM || "OpenCRM <noreply@opencrm.app>";

    await transporter.sendMail({ from, to, subject, html, text });
}
