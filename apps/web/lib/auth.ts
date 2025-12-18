import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins/jwt";

export const auth = betterAuth({
  // Better Auth enforces >= 32 chars.
  secret: process.env.BETTER_AUTH_SECRET,
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


