import type { NextAuthConfig } from 'next-auth';

const DEPOP_SITE_URL = 'https://www.depop.com/wannabevintagedotcom/';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboardOrPrint = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname.startsWith('/tags');
      const isItemPageRedirect = nextUrl.pathname.startsWith('/dashboard/items/') && nextUrl.searchParams.get('source') === 'qr';

      if (isItemPageRedirect) {
        if (isLoggedIn) return true;
        // Return a redirect response instead of false
        return Response.redirect(DEPOP_SITE_URL);
      }

      if (isOnDashboardOrPrint) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard/items', nextUrl));
      }
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;