"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Middleware handles the redirect, but this serves as a fallback
    router.push("/profile");
  }, [router]);

  return null;
}
