import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { pool } from "@/lib/db";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:
        process.env.GOOGLE_CLIENT_ID!,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {

    async signIn({
      user,
    }) {

      const email =
        user.email;

      if (!email) {
        return false;
      }

      const existingUser =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE email = $1
          `,
          [email]
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
          [email]
        );

      }

      return true;

    },

  },

});

export {
  handler as GET,
  handler as POST,
};