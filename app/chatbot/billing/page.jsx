"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/chatbot">
          <Button variant="outline" size="sm" className="gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Billing</h1>
            <p className="text-muted-foreground">
              Manage your billing and subscription
            </p>
          </div>

          <Card className="p-12 text-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">
                Billing page coming soon
              </h2>
              <p className="text-muted-foreground">
                Billing management will be available here. Check back later.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
