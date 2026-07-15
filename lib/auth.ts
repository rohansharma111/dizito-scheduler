import { pool } from "@/lib/db";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    /*
      LOGIN
    */
    async signIn({ user }: any) {
      if (!user.email) {
        return false;
      }

      const existingUser = await pool.query(
        `
        SELECT
          id,
          plan,
          onboarding_completed,
          onboarding_step
        FROM users
        WHERE email = $1
        `,
        [user.email],
      );

      /*
        First login
      */
      if (existingUser.rows.length === 0) {
        await pool.query(
          `
          INSERT INTO users
          (
            name,
            email,
            plan,
            onboarding_completed,
            onboarding_step
          )
          VALUES
          (
            $1,$2,$3,$4,$5
          )
          `,
          [user.name ?? user.email.split("@")[0], user.email, "free", false, 1],
        );
      } else {
        /*
          Keep Google profile
          name updated
        */
        await pool.query(
          `
          UPDATE users
          SET
            name = $1
          WHERE email = $2
          `,
          [user.name ?? user.email.split("@")[0], user.email],
        );
      }

      return true;
    },

    /*
      JWT
    */
    async jwt({ token }: any) {
      if (token.email) {
        const result = await pool.query(
          `
          SELECT
            id,
            name,
            plan,
            onboarding_completed,
            onboarding_step
          FROM users
          WHERE email = $1
          `,
          [token.email],
        );

        if (result.rows.length > 0) {
          const dbUser = result.rows[0];

          token.userId = dbUser.id;

          token.name = dbUser.name;

          token.plan = dbUser.plan || "free";

          token.onboardingCompleted = dbUser.onboarding_completed;

          token.onboardingStep = dbUser.onboarding_step;
        }
      }

      return token;
    },

    /*
      SESSION
    */
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.userId;

        session.user.name = token.name;

        session.user.plan = token.plan || "free";

        session.user.onboardingCompleted = token.onboardingCompleted ?? false;

        session.user.onboardingStep = token.onboardingStep ?? 1;
      }

      return session;
    },
  },
};
