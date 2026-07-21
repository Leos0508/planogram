import { cache } from "react";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

/**
 * Request-deduped session user. Multiple RSC callers share one `auth()` resolve.
 */
export const requireSessionUser = cache(
  async (): Promise<
    { ok: true; user: SessionUser } | { ok: false; message: string }
  > => {
    const session = await auth();
    const id = session?.user?.id;
    const email = session?.user?.email;

    if (!id || !email) {
      return { ok: false, message: "You must be signed in." };
    }

    return {
      ok: true,
      user: {
        id,
        email,
        name: session.user?.name,
      },
    };
  },
);
