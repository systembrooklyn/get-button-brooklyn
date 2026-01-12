"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { handleSignUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { UserPlus, Mail, LockKeyhole, ArrowRight, Check } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const result = await handleSignUp(email, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/chatbot");
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md p-8 space-y-8 border border-border/50 shadow-2xl bg-card/80 backdrop-blur-xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-accent">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-muted-foreground">
            Join thousands of websites using GetButton
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="pl-10 h-11 bg-background/50 border-muted-foreground/20 focus:border-accent focus:ring-accent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium ml-1">
              Password
            </label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pl-10 h-11 bg-background/50 border-muted-foreground/20 focus:border-accent focus:ring-accent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium ml-1"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Check className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="pl-10 h-11 bg-background/50 border-muted-foreground/20 focus:border-accent focus:ring-accent"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 btn-accent text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner className="w-4 h-4" /> Creating Account...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            Already have an account?{" "}
          </span>
          <Link
            href="/login"
            className="font-semibold text-accent hover:underline hover:text-accent/80 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
