'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
export default function Header() {
  const pathname = usePathname();
  const isCompany = pathname?.startsWith("/dashboard/company");
  const logoHref = "/dashboard/company";

  return (
    <header className="bg-[var(--brand)] text-[var(--brand)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo on the left, centered vertically */}
        {isCompany ? (
          <Link href={logoHref} className="flex items-center">
            <Image
              src="/COLAB_logo_reverse.png"
              alt="COLAB connects logo"
              width={180}
              height={40}
              priority
              style={{ width: "180px", height: "auto" }}
            />
          </Link>
        ) : (
          <div className="flex items-center">
            <Image
              src="/COLAB_logo_reverse.png"
              alt="COLAB connects logo"
              width={180}
              height={40}
              priority
              style={{ width: "180px", height: "auto" }}
            />
          </div>
        )}
      </div>
    </header>
  );
}
