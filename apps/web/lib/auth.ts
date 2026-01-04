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

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@meuflip.com";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "https://meuflip.com",
  trustedOrigins: [
    "https://meuflip.com",
    "https://www.meuflip.com",
    ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
  ],
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Confirme seu email - Meu Flip",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bem-vindo ao Meu Flip!</h2>
            <p>Olá ${user.name || ""},</p>
            <p>Clique no botão abaixo para confirmar seu email:</p>
            <a href="${url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Confirmar email
            </a>
            <p style="color: #666; font-size: 14px;">
              Ou copie este link: ${url}
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 32px;">
              Se você não criou uma conta no Meu Flip, ignore este email.
            </p>
          </div>
        `,
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


