import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import ThemeProvider from "@/components/theme-provider";
import { createClient } from "@/utils/supabase/server";
import Script from "next/script";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata = {
  title: "AI Chatbot Platform",
  description: "Create and manage AI chatbots",
};

export default async function RootLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {/* ✅ Chatbot embed */}
        <Script
          src="https://get-button-brooklyn-one.vercel.app//api/chat/cmkwvaacy0001tbag8bslxdht/embed"
          strategy="afterInteractive"
        />

        <ThemeProvider>
          <Navbar user={user} />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
