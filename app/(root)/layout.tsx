import { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";

import Header from "@/components/Header";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";

const HomeLayout = async ({ children }: { children: ReactNode }) => {
  // Authenticate the session & Redirect if the session is not available
  const session = await auth();
  if (!session) redirect("/sign-in");

  // Run post-request logic using after
  after(async () => {
    if (!session?.user?.id) return;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session?.user?.id))
      .limit(1);

    // Get today's date in YYYY-MM-DD format. If lastActivityDate is already today's date, no update needed
    if (user[0].lastActivityDate === new Date().toISOString().slice(0, 10))
      return;

    // Update the lastActivityDate to today's date
    await db
      .update(users)
      .set({ lastActivityDate: new Date().toISOString().slice(0, 10) })
      .where(eq(users.id, session?.user?.id));
  });

  return (
    <main className="root-container">
      <div className="mx-auto max-w-7xl">
        <Header session={session} />

        <div className="mt-20 pb-20">{children}</div>
      </div>
    </main>
  );
};

export default HomeLayout;
