import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** `User.passwordChangedAt` ms when this JWT was issued/refreshed. */
    pwdChangedAt?: number;
    /** Wall-clock ms of the last Postgres passwordChangedAt check (PLA-99). */
    pwdCheckedAt?: number;
  }
}
