"use client";

import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { label: "Add", href: "/add" },
  { label: "Now", href: "/now" },
  { label: "Projects", href: "/projects" },
  { label: "Settings", href: "/settings" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 px-4 pt-4 pb-0">
      {LINKS.map(({ label, href }) => (
        <button
          key={href}
          onClick={() => router.push(href)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition ${
            pathname === href
              ? "bg-black text-white"
              : "text-gray-400 hover:text-black"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
