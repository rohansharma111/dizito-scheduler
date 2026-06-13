import { pool } from "@/lib/db";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:
        process.env.GOOGLE_CLIENT_ID!,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user }: any) {
      if (!user.email) {
        return false;
      }

      const existingUser =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE email = $1
          `,
          [user.email]
        );

      if (
        existingUser.rows.length === 0
      ) {
        await pool.query(
          `
          INSERT INTO users
          (
            email
          )
          VALUES
          (
            $1
          )
          `,
          [user.email]
        );
      }

      return true;
    },

    async jwt({ token }: any) {
      if (token.email) {
        const result =
          await pool.query(
            `
            SELECT id
            FROM users
            WHERE email = $1
            `,
            [token.email]
          );

        if (
          result.rows.length > 0
        ) {
          token.userId =
            result.rows[0].id;
        }
      }

      return token;
    },

    async session({
      session,
      token,
    }: any) {
      if (session.user) {
        session.user.id =
          token.userId;
      }

      return session;
    },
  },
};