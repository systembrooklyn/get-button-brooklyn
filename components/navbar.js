"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Moon, Sun, LogOut, MessageCircle, Menu, X } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, [supabase]);

  const toggleTheme = useCallback(() => {
    const isDarkMode = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    setIsDark(isDarkMode);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!mounted) return null;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (isAuthPage) return null;

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/chatbot")}
            className="flex items-center gap-2 font-semibold text-lg text-accent hover:opacity-80 transition-opacity"
          >
            <MessageCircle className="w-5 h-5" />
            <span>AI Chat</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="text-sm text-muted-foreground truncate max-w-xs">
              {user.email}
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {user && (
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-destructive/10 transition-colors text-destructive"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
