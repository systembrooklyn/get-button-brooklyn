"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Moon, Sun, Globe } from "lucide-react";

export default function Navbar({ user: initialUser }) {
  const [user, setUser] = useState(initialUser);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Mount + theme
  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // ✅ ONLY listen for auth changes (NO redirects)
  useEffect(() => {
    if (!mounted) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh(); // keep server components in sync
    });

    return () => subscription.unsubscribe();
  }, [mounted, supabase, router]);

  const toggleTheme = useCallback(() => {
    const isDarkMode = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    setIsDark(isDarkMode);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // SOFT redirect only
  };

  if (!mounted) return null;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (isAuthPage) return null;

  return (
    <nav className="bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#60a5fa] border-b border-blue-600/20">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* LOGO */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[#2563eb]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-white text-lg leading-tight">
              GetButton
            </div>
            <div className="text-xs text-white/80 leading-tight">
              Trusted by 743,358 websites
            </div>
          </div>
        </div>

        {/* NAV LINKS */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-white hover:bg-white/10 rounded-full text-sm font-medium"
          >
            Chat buttons
          </button>
          <button
            onClick={() => router.push("/chatbot")}
            className="px-4 py-2 text-white hover:bg-white/10 rounded-full text-sm font-medium"
          >
            AI Chatbots
          </button>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full hover:bg-white/10 text-white"
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <Globe className="w-5 h-5 text-white" />

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-white text-sm hidden sm:inline">
                @{user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-5 py-2 bg-white text-[#2563eb] rounded-full text-sm font-medium"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="px-5 py-2 bg-white text-[#2563eb] rounded-full text-sm font-medium"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
