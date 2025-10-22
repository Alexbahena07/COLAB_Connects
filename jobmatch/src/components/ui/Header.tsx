'use client';

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="bg-[--brand] text-[--brand]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo on the left, centered vertically */}
        <Link href="/" className="flex items-center">
          <Image
            src="/COLAB_logo_reverse.png"
            alt="COLAB connects logo"
            width={180}   // adjusted for balance
            height={40}
            priority
          />
        </Link>

        {/* Right side buttons */}
        {status === "loading" ? null : session ? (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm rounded-lg bg-white px-4 py-2 font-semibold text-[--brand] hover:opacity-90"
          >
            Logout
          </button>
        ) : (
          <div className="space-x-3">
            <Link
              href="/login"
              className="text-sm rounded-lg bg-white px-4 py-2 font-semibold text-[--brand] hover:opacity-90"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm rounded-lg bg-white px-4 py-2 font-semibold text-[--brand] hover:opacity-90"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
