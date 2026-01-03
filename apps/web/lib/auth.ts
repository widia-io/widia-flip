import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins/jwt";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://widia:widia@localhost:5432/widia_flip?sslmode=disable",
  options: "-c search_path=flip",
});

export const auth = betterAuth({
  // Better Auth enforces >= 32 chars.
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "https://meuflip.com",
  trustedOrigins: ["https://meuflip.com", "https://www.meuflip.com"],
  database: pool,
  emailAndPassword: { enabled: true },
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


