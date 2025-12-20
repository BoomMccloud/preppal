import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";
import { env } from "~/env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }
}

// Development test users
const DEV_USERS = [
  {
    id: "dev-user-1",
    email: "dev1@preppal.com",
    password: "dev123",
    name: "Dev User 1",
    image: null,
  },
  {
    id: "dev-user-2",
    email: "dev2@preppal.com",
    password: "dev123",
    name: "Dev User 2",
    image: null,
  },
  {
    id: "dev-user-3",
    email: "dev3@preppal.com",
    password: "dev123",
    name: "Dev User 3",
    image: null,
  },
] as const;

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    // Add credentials provider only in development
    ...(env.NODE_ENV === "development"
      ? [
          CredentialsProvider({
            name: "Development Login",
            credentials: {
              email: {
                label: "Email",
                type: "email",
                placeholder: "dev1@preppal.com",
              },
              password: {
                label: "Password",
                type: "password",
                placeholder: "dev123",
              },
            },
            async authorize(credentials) {
              console.log("🔐 Authorize called with:", {
                email: credentials?.email,
                passwordProvided: !!credentials?.password,
              });

              if (!credentials?.email || !credentials?.password) {
                console.log("❌ Missing email or password");
                return null;
              }

              const user = DEV_USERS.find(
                (u) =>
                  u.email === credentials.email &&
                  u.password === credentials.password,
              );

              if (!user) {
                console.log("❌ User not found in DEV_USERS");
                return null;
              }

              console.log("✅ Found user in DEV_USERS:", user.email);

              try {
                // Ensure user exists in database
                const existingUser = await db.user.findUnique({
                  where: { email: user.email },
                });

                if (existingUser) {
                  console.log(
                    "✅ Found existing user in database:",
                    existingUser.email,
                  );
                  return {
                    id: existingUser.id,
                    email: existingUser.email,
                    name: existingUser.name,
                    image: existingUser.image,
                  };
                }

                // Create user if doesn't exist
                console.log("🆕 Creating new user in database:", user.email);
                const newUser = await db.user.create({
                  data: {
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    emailVerified: new Date(),
                  },
                });

                console.log("✅ Created new user:", newUser.email);
                return {
                  id: newUser.id,
                  email: newUser.email,
                  name: newUser.name,
                  image: newUser.image,
                };
              } catch (error) {
                console.error("❌ Database error:", error);
                return null;
              }
            },
          }),
        ]
      : []),
    // Email OTP provider for passwordless authentication (works in all environments)
    CredentialsProvider({
      id: "email-otp",
      name: "Email",
      credentials: {
        userId: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId) return null;

        const user = await db.user.findUnique({
          where: { id: credentials.userId as string },
        });

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    // Add Google provider only if credentials are available
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET ? [GoogleProvider] : []),
  ],
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user?.id) {
        // User is only available on sign-in
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.id && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
