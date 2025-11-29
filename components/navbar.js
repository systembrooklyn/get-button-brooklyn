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

  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
    };

    checkUser();
  }, [supabase, pathname]);

  // Auth state listener
  useEffect(() => {
    if (!mounted) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("[v0] Auth state changed:", _event, session?.user?.email);
      setUser(session?.user ?? null);

      // Specifically handle sign out event to redirect immediately
      if (_event === "SIGNED_OUT") {
        window.location.href = "/login";
      } else {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, mounted, router]);

  // Route protection: Exit chatbot or profile page if not logged in
  useEffect(() => {
    if (mounted && !user) {
      const protectedRoutes = ["/chatbot", "/profile"];
      // Check if current path starts with any protected route
      if (protectedRoutes.some((route) => pathname?.startsWith(route))) {
        // Use hard redirect to ensure we clear the protected page state completely
        window.location.href = "/login";
      }
    }
  }, [user, pathname, mounted]);

  const toggleTheme = useCallback(() => {
    const isDarkMode = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    setIsDark(isDarkMode);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setUser(null);
      // Hard redirect to login page to ensure complete exit from the app context
      window.location.href = "/login";
    }
  };

  if (!mounted) return null;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (isAuthPage) return null;

  return (
    <nav className="bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#60a5fa] border-b border-blue-600/20">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
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

        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-white hover:bg-white/10 rounded-full transition-colors text-sm font-medium"
          >
            Chat buttons
          </button>
          <button
            onClick={() => router.push("/chatbot")}
            className="px-4 py-2 text-white hover:bg-white/10 rounded-full transition-colors text-sm font-medium"
          >
            AI Chatbots
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="px-4 py-2 text-white hover:bg-white/10 rounded-full transition-colors text-sm font-medium"
          >
            Profile{" "}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors text-white"
            aria-label="Toggle theme"
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
              <span className="text-white text-sm font-medium hidden sm:inline-block">
                Welcome @{user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-5 py-2 bg-white text-[#2563eb] rounded-full font-medium text-sm hover:bg-white/90 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="px-5 py-2 bg-white text-[#2563eb] rounded-full font-medium text-sm hover:bg-white/90 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
