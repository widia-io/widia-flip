import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins/jwt";
import { Pool } from "pg";
import { Resend } from "resend";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://widia:widia@localhost:5432/widia_flip?sslmode=disable",
  options: "-c search_path=flip",
});

// Lazy initialization to avoid build-time errors when env vars are not set
let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// SVG logo inline for emails (emails don't support CSS classes)
const logoSvg = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 32V8L14 20L24 8L28 4" stroke="#1E293B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M23 4H28V9" stroke="#1E293B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M20 32V12H34" stroke="#14B8A6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 22H30" stroke="#14B8A6" stroke-width="4" stroke-linecap="round"/>
</svg>`;

function getResetPasswordEmailHtml(userName: string, resetUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 10px;">
                    ${logoSvg}
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 24px; font-weight: 700; color: #18181b;">meuflip</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b; text-align: center;">
                Redefinir sua senha
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b; text-align: center;">
                Olá${userName ? ` ${userName}` : ""},<br>
                Clique no botão abaixo para redefinir sua senha.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetUrl}"
                       style="display: inline-block; background-color: #2563eb; color: white; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Redefinir senha
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center; word-break: break-all;">
                Ou copie este link:<br>
                <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a1a1aa; text-align: center;">
                Se você não solicitou esta ação, ignore este email.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer branding -->
        <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
          © ${new Date().getFullYear()} meuflip. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getVerificationEmailHtml(userName: string, verificationUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 10px;">
                    ${logoSvg}
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 24px; font-weight: 700; color: #18181b;">meuflip</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b; text-align: center;">
                Confirme seu email
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b; text-align: center;">
                Olá${userName ? ` ${userName}` : ""},<br>
                Clique no botão abaixo para verificar seu email e começar a usar o Meu Flip.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${verificationUrl}"
                       style="display: inline-block; background-color: #2563eb; color: white; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Verificar email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center; word-break: break-all;">
                Ou copie este link:<br>
                <a href="${verificationUrl}" style="color: #2563eb;">${verificationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a1a1aa; text-align: center;">
                Se você não criou uma conta no Meu Flip, ignore este email.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer branding -->
        <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
          © ${new Date().getFullYear()} meuflip. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "https://meuflip.com",
  trustedOrigins: [
    "https://meuflip.com",
    "https://www.meuflip.com",
    ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
  ],
  database: pool,
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
      },
      accepted_terms_at: {
        type: "string", // ISO timestamp string
        required: false,
        fieldName: "accepted_terms_at",
      },
      marketing_opt_in_at: {
        type: "string", // ISO timestamp string
        required: false,
        fieldName: "marketing_opt_in_at",
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@meuflip.com";
      await getResend().emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Redefinir sua senha - Meu Flip",
        html: getResetPasswordEmailHtml(user.name || "", url),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@meuflip.com";
      await getResend().emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Confirme seu email - Meu Flip",
        html: getVerificationEmailHtml(user.name || "", url),
      });
    },
  },
  plugins: [
    nextCookies(),
    jwt({
      jwt: {
        issuer: "widia-flip",
        audience: "widia-flip-api",
      },
    }),
  ],
});

