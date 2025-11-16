"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, LogOut } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">Welcome, {user?.email}</p>
          </div>

          <div className="py-4 border-t border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Email Address
              </label>
              <p className="text-base">{user?.email}</p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                User ID
              </label>
              <p className="text-base font-mono text-xs break-all">
                {user?.id}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Last Signed In
              </label>
              <p className="text-base">
                {new Date(user?.last_sign_in_at).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <Button
            onClick={() => router.push("/chatbot")}
            className="w-full gap-2 btn-accent"
          >
            <MessageCircle className="w-4 h-4" />
            Go to AI Chatbots
          </Button>

          <Button
            className="w-full gap-2"
            variant="outline"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
