import Link from 'next/link';
import NavLinks from '@/components/dashboard/nav-links';
import { PowerIcon } from '@heroicons/react/24/outline';
import { signOut } from '@/auth';
import styles from "@/styles/home.module.css";

export default function SideNav() {
  return (
    <div className={[styles.sometypeMono, "flex h-full flex-col px-3 py-4 md:px-2 sideNav"].join(" ")}>
      <Link
        className={`mb-2 flex items-end justify-start rounded-md p-4`}
        href="/"
      >
        <img
            src="/images/wannabebannerlow.jpg"
            alt="Wannabe Vintage Logo"
            className="object-cover md:object-contain w-full h-full"
        />
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
        >
          <button className="flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3">
            <PowerIcon className="w-6" />
            <div className="hidden md:block">Sign Out</div>
          </button>
        </form>
      </div>
    </div>
  );
}
