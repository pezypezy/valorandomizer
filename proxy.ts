// Next.js 16 renamed `middleware` to `proxy`. next-intl's middleware handler
// is just a request handler, so we export it as the proxy default.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except API routes, Next internals, and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
