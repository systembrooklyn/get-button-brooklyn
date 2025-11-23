"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MessageCircle,
  LogOut,
  User,
  Mail,
  Calendar,
  Shield,
  Fingerprint,
  Settings,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

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
      } else {
        router.push("/login");
      }
      setLoading(false);
    };

    getUser();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // Get user initial for avatar
  const userInitial = user?.email ? user.email[0].toUpperCase() : "U";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Account Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your personal information and preferences.
            </p>
          </div>
          <Button
            onClick={() => router.push("/chatbot")}
            className="btn-accent gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column: Identity Card */}
          <Card className="md:col-span-1 p-6 flex flex-col items-center text-center space-y-6 border-border shadow-md h-fit">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-background group-hover:scale-105 transition-transform duration-300">
                {userInitial}
              </div>
              <div
                className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-background"
                title="Online"
              ></div>
            </div>

            <div className="space-y-1 w-full">
              <h2 className="font-bold text-2xl truncate px-2">{userName}</h2>
              <p className="text-sm text-muted-foreground truncate px-2">
                {user?.email}
              </p>
              <div className="flex justify-center mt-2">
                <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full border border-accent/20">
                  Free Plan
                </span>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-border space-y-3">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </Card>

          {/* Right Column: Details & Settings */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Info Card */}
            <Card className="p-8 space-y-6 border-border shadow-md">
              <div className="flex items-center gap-2 pb-4 border-b border-border">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Personal Information</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {user?.email}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    User ID
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border group relative">
                    <Fingerprint className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono truncate">
                      {user?.id}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Last Active
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {user?.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Auth Provider
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium capitalize">
                      {user?.app_metadata?.provider || "Email"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Danger Zone Card */}
            <Card className="border-destructive/30 shadow-none overflow-hidden">
              <div className="bg-destructive/5 p-4 border-b border-destructive/10 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h3 className="font-semibold text-destructive">Danger Zone</h3>
              </div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-medium text-foreground">
                      Delete Account
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently remove your account, chatbots, and all data.
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    className="shrink-0"
                    onClick={() =>
                      alert(
                        "Please contact support at support@getbutton.io to process account deletion requests."
                      )
                    }
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>

            <div className="text-center text-sm text-muted-foreground pt-4">
              <p>
                Need help?{" "}
                <a
                  href="#"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  Contact Support <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
