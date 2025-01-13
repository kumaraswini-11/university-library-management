import { serve } from "@upstash/workflow/nextjs";
import { eq } from "drizzle-orm";

import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { sendEmail } from "@/lib/workflow";

type UserState = "non-active" | "active";

type InitialData = {
  email: string;
  fullName: string;
};

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const THREE_DAYS_IN_MS = 3 * ONE_DAY_IN_MS;
const THIRTY_DAYS_IN_MS = 30 * ONE_DAY_IN_MS;

// Function to determine user state based on last activity date
const getUserState = async (email: string): Promise<UserState> => {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) return "non-active";

    const lastActivityDate = new Date(user[0].lastActivityDate!);
    const now = new Date();
    const timeDifference = now.getTime() - lastActivityDate.getTime();

    if (
      timeDifference > THREE_DAYS_IN_MS &&
      timeDifference <= THIRTY_DAYS_IN_MS
    ) {
      return "non-active";
    }

    return "active";
  } catch (error) {
    console.error(`Error fetching user state for ${email}:`, error);
    throw new Error("Failed to fetch user state");
  }
};

// Workflow definition
export const { POST } = serve<InitialData>(async (context) => {
  const { email, fullName } = context.requestPayload;

  // Step 1: Send welcome email
  await context.run("new-signup", async () => {
    await sendEmail({
      email,
      subject: "Welcome to the platform",
      message: `Welcome ${fullName}!`,
    });
  });

  // Step 2: Wait for 3 days
  await context.sleep("wait-for-3-days", 60 * 60 * 24 * 3);

  // Step 3: Start monitoring user activity
  while (true) {
    const state = await context.run("check-user-state", async () => {
      return await getUserState(email);
    });

    // Helper function to send emails
    if (state === "non-active") {
      await context.run("send-email-non-active", async () => {
        await sendEmail({
          email,
          subject: "Are you still there?",
          message: `Hey ${fullName}, we miss you!`,
        });
      });
    } else if (state === "active") {
      await context.run("send-email-active", async () => {
        await sendEmail({
          email,
          subject: "Welcome back!",
          message: `Welcome back ${fullName}!`,
        });
      });
    }

    // Wait for 30 days before checking again
    await context.sleep("wait-for-1-month", 60 * 60 * 24 * 30);

    // TODO: Stop monitoring after 6 months
  }
});
