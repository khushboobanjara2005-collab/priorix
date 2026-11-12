import { betterAuth } from "better-auth";
import { database } from "@/lib/server/database";

export const auth = betterAuth({
  appName: "Priorix",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
});
