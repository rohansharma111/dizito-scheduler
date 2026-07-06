import crypto from "crypto";
import { pool } from "@/lib/db";
import { createEvent } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const signature = request.headers.get("x-razorpay-signature");

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expected) {
      return Response.json(
        {
          error: "Invalid signature",
        },
        {
          status: 401,
        },
      );
    }

    const payload = JSON.parse(body);

    const event = payload.event;

    console.log("RAZORPAY EVENT:", event);

    const subscription = payload.payload?.subscription?.entity;

    if (!subscription) {
      return Response.json({
        success: true,
      });
    }

    const subscriptionId = subscription.id;

    const userResult = await pool.query(
      `
        SELECT *
        FROM users
        WHERE
          subscription_id = $1
        `,
      [subscriptionId],
    );

    const user = userResult.rows[0];

    if (!user) {
      console.warn("User not found for subscription", subscriptionId);

      return Response.json({
        success: true,
      });
    }

    switch (event) {
      /*
        Activated
      */
      case "subscription.activated": {
        await pool.query(
          `
          UPDATE users
          SET
            plan =
              subscription_plan,
            subscription_status =
              'active'
          WHERE id = $1
          `,
          [user.id],
        );

        await createEvent(
          "SUBSCRIPTION_ACTIVATED",
          "subscription",
          0,
          user.id,
          {
            subscriptionId,
            plan: user.subscription_plan,
          },
        );

        break;
      }

      /*
        Payment success
      */
      case "subscription.charged": {
        const charge = payload.payload?.payment?.entity;

        await pool.query(
          `
          UPDATE users
          SET
            current_period_end =
              NOW()
              +
              INTERVAL '1 month'
          WHERE id = $1
          `,
          [user.id],
        );

        await pool.query(
          `
          INSERT INTO billing_events
          (
            user_id,
            event,
            amount,
            subscription_id
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4
          )
          `,
          [
            user.id,
            "charged",
            charge?.amount ? charge.amount / 100 : 0,
            subscriptionId,
          ],
        );

        await createEvent("SUBSCRIPTION_CHARGED", "subscription", 0, user.id, {
          amount: charge?.amount,
          subscriptionId,
        });

        break;
      }

      /*
        Payment failed
      */
      case "subscription.halted": {
        await pool.query(
          `
          UPDATE users
          SET
            plan = 'free',
            subscription_status =
              'halted'
          WHERE id = $1
          `,
          [user.id],
        );

        await createEvent("SUBSCRIPTION_HALTED", "subscription", 0, user.id, {
          subscriptionId,
        });

        break;
      }

      /*
        Cancelled
      */
      case "subscription.cancelled": {
        await pool.query(
          `
          UPDATE users
          SET
            plan='free',
            subscription_status=
              'cancelled'
          WHERE id = $1
          `,
          [user.id],
        );

        await createEvent(
          "SUBSCRIPTION_CANCELLED",
          "subscription",
          0,
          user.id,
          {
            subscriptionId,
          },
        );

        break;
      }

      default:
        console.log("Ignoring:", event);
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("WEBHOOK ERROR", error);

    return Response.json(
      {
        error: "Webhook failed",
      },
      {
        status: 500,
      },
    );
  }
}
