import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/planograms/:path*",
    "/skus/:path*",
    "/settings/:path*",
    "/invite/:path*",
  ],
};
