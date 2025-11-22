"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  FaFacebookMessenger,
  FaWhatsapp,
  FaEnvelope,
  FaTelegramPlane,
  FaYoutube,
  FaLine,
  FaViber,
  FaSnapchatGhost,
  FaDiscord,
  FaWeixin,
  FaSlack,
  FaLinkedin,
  FaTwitter,
  FaInstagram,
  FaSkype,
  FaVk,
} from "react-icons/fa";

export default function Home() {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    const checkUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    checkUser();
  }, [supabase]);

  const handleGetButton = () => {
    if (user) {
      router.push("/chatbot");
    } else {
      alert("Please login to access the chatbot page");
      router.push("/login");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* <Navbar user={user} /> */}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#60a5fa] pt-20 pb-32">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight text-balance">
                Messaging Apps & Custom AI Chatbots for Your Website
              </h1>
              <p className="text-xl text-white/90 leading-relaxed max-w-xl text-pretty">
                Engage Website Visitors with a Single, All-in-One Chat Button
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleGetButton}
                  className="bg-white text-[#2563eb] hover:bg-white/95 font-semibold text-base rounded-full px-8 py-3 shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Get Your Button
                </button>
                <button className="bg-transparent text-white hover:bg-white/10 font-semibold text-base rounded-full px-8 py-3 border-2 border-white transition-all duration-300">
                  Watch Video
                </button>
                <p className="w-full text-sm text-white/80 mt-2">
                  No coding required
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-card rounded-3xl shadow-2xl p-6 max-w-md mx-auto transform hover:scale-105 transition-transform duration-300">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl p-4 flex items-center justify-between -mx-6 -mt-6 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="w-6 h-6 text-white"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Bob</p>
                      <p className="text-sm text-white/90">Manager</p>
                    </div>
                  </div>
                  <button className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="w-5 h-5"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="text-center text-xs text-muted-foreground">
                    12:00
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="w-5 h-5 text-orange-600"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
                      <p className="text-sm text-foreground">
                        Hello, how may we help you? Just send us a message now
                        to get assistance.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold text-foreground mb-3 text-center">
                    Start Chat with:
                  </p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    <button className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <FaWhatsapp className="w-6 h-6 text-white" />
                    </button>
                    <button className="w-12 h-12 bg-[#0084FF] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <FaFacebookMessenger className="w-6 h-6 text-white" />
                    </button>
                    <button className="w-12 h-12 bg-[#7B68EE] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <FaViber className="w-6 h-6 text-white" />
                    </button>
                    <button className="w-12 h-12 bg-[#EA4335] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <FaEnvelope className="w-6 h-6 text-white" />
                    </button>
                    <button className="w-12 h-12 bg-[#FFFC00] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <FaSnapchatGhost className="w-6 h-6 text-gray-800" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce cursor-pointer">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-8 h-8 text-white"
                  strokeWidth="2.5"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Get Your Button in Three Simple Steps
            </h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-accent to-primary mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Step 1 Card */}
            <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-6 h-6 text-white"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    STEP 1
                  </p>
                  <h3 className="text-lg font-bold text-foreground">
                    Choose your apps
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Select from 20+ messaging platforms and custom AI chatbots to
                connect with your visitors.
              </p>
            </div>

            {/* Step 2 Card */}
            <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-6 h-6 text-white"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6m8.66-14.66l-4.24 4.24m-4.24 4.24l-4.24 4.24m15.56 0l-4.24-4.24m-4.24-4.24L2.34 2.34" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    STEP 2
                  </p>
                  <h3 className="text-lg font-bold text-foreground">
                    Customize your button
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose button style, animations, colors, position, and more to
                match your brand.
              </p>
            </div>

            {/* Step 3 Card */}
            <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-6 h-6 text-white"
                    strokeWidth="2"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    STEP 3
                  </p>
                  <h3 className="text-lg font-bold text-foreground">
                    Boost with Greeting
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Boost engagement and conversions with personalized greeting
                messages for your visitors.
              </p>
            </div>
          </div>

          <div className="space-y-16">
            {/* Step 1 Demo */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-accent/10 rounded-full px-4 py-2 mb-4">
                  <span className="text-xs font-bold text-accent">01</span>
                  <span className="text-sm font-semibold text-foreground">
                    Choose your apps
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Connect Multiple Messaging Platforms
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Select from 20+ messaging platforms including WhatsApp,
                  Messenger, Telegram, and custom AI chatbots to create a
                  unified communication hub for your website visitors.
                </p>
              </div>

              <div className="bg-card rounded-3xl shadow-2xl p-8 border border-border">
                <div className="grid grid-cols-5 gap-3 mb-8">
                  <button className="w-14 h-14 bg-[#0084FF] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaFacebookMessenger className="w-7 h-7 text-white" />
                  </button>
                  <button className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaWhatsapp className="w-7 h-7 text-white" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaEnvelope className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaTelegramPlane className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaYoutube className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaLine className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaTwitter className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaInstagram className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaViber className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaWeixin className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaDiscord className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaSlack className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaLinkedin className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaSkype className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <FaVk className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-2 border-green-500 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center">
                        <FaWhatsapp className="w-6 h-6 text-white" />
                      </div>
                      <span className="font-semibold text-foreground">
                        WhatsApp
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      placeholder="Phone Number or Group Chat Link"
                      className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-2 border-blue-500 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            AI
                          </span>
                        </div>
                        <span className="font-semibold text-foreground">
                          AI Chatbot
                        </span>
                      </div>
                      <button className="bg-accent text-accent-foreground text-xs font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-colors shadow-lg">
                        + Create FREE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 Demo */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="lg:order-2">
                <div className="inline-flex items-center gap-2 bg-accent/10 rounded-full px-4 py-2 mb-4">
                  <span className="text-xs font-bold text-accent">02</span>
                  <span className="text-sm font-semibold text-foreground">
                    Customize your button
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Match Your Brand Perfectly
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Customize every aspect of your chat button including style,
                  animations, colors, border, notifications, and position to
                  create a seamless experience that matches your website&apos;s
                  design.
                </p>
              </div>

              <div className="bg-card rounded-3xl shadow-2xl p-8 border border-border lg:order-1">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Button style
                    </label>
                    <div className="flex gap-3">
                      <button className="flex-1 bg-accent text-accent-foreground font-semibold py-3 px-6 rounded-full hover:opacity-90 transition-colors shadow-lg">
                        Classic
                      </button>
                      <button className="flex-1 bg-muted text-foreground font-semibold py-3 px-6 rounded-full hover:bg-muted/80 transition-colors">
                        Rectangle
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">
                      Animation
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      <span className="ml-3 text-sm font-medium text-foreground">
                        Enable
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">
                      Border
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      <span className="ml-3 text-sm font-medium text-foreground">
                        Enable
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">
                      Notification
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      <span className="ml-3 text-sm font-medium text-foreground">
                        Enable
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 Demo */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-accent/10 rounded-full px-4 py-2 mb-4">
                  <span className="text-xs font-bold text-accent">03</span>
                  <span className="text-sm font-semibold text-foreground">
                    Boost with Greeting Message
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Engage Visitors Proactively
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Set up personalized greeting messages with agent information
                  to boost engagement and conversions. Welcome visitors with a
                  friendly message that encourages them to start a conversation.
                </p>
              </div>

              <div className="bg-card rounded-3xl shadow-2xl p-8 border border-border">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Agent name
                    </label>
                    <input
                      type="text"
                      defaultValue="Bob"
                      className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Agent position
                    </label>
                    <input
                      type="text"
                      defaultValue="Manager"
                      className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Greeting message
                    </label>
                    <textarea
                      rows={3}
                      defaultValue="Hello 👋 How may we help you? Just send us a message now to get assistance."
                      className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Call to action
                    </label>
                    <input
                      type="text"
                      defaultValue="Message us 👋"
                      className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground text-center mb-16">
            What Customers Say About Us
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-card rounded-3xl shadow-xl p-8 border border-border">
              <div className="flex items-start gap-4 mb-4">
                <img
                  src="/placeholder.svg?height=60&width=60"
                  alt="Customer"
                  className="w-14 h-14 rounded-full"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">
                    Marcello Petenuzzo
                  </h4>
                  <p className="text-sm text-muted-foreground">aquahotel.it</p>
                </div>
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                I love this app. It is so easy to implement. I am not an IT
                expert but I did it. I highly recommend this app for everybody
                who wants to stay connected with their customer.
              </p>
            </div>

            <div className="bg-card rounded-3xl shadow-xl p-8 border border-border">
              <div className="flex items-start gap-4 mb-4">
                <img
                  src="/placeholder.svg?height=60&width=60"
                  alt="Customer"
                  className="w-14 h-14 rounded-full"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Anja Tietz</h4>
                  <p className="text-sm text-muted-foreground">
                    aliceSocial.com
                  </p>
                </div>
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Great app! it works perfectly! simply and directly. fulfills the
                function. we are using messenger and whatsapp. thank you very
                much to the developers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-background border-t border-border py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-sm text-muted-foreground mb-4">
            <a href="#" className="hover:text-accent transition-colors">
              Knowledge base
            </a>
            <span className="text-muted-foreground/50">·</span>
            <a href="#" className="hover:text-accent transition-colors">
              Terms of Use
            </a>
            <span className="text-muted-foreground/50">·</span>
            <a href="#" className="hover:text-accent transition-colors">
              Privacy Policy
            </a>
            <span className="text-muted-foreground/50">·</span>
            <a href="#" className="hover:text-accent transition-colors">
              Lost your Key?
            </a>
            <span className="text-muted-foreground/50">·</span>
            <a
              href="mailto:customer-success@getbutton.io"
              className="hover:text-accent transition-colors"
            >
              customer-success@getbutton.io
            </a>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-sm text-muted-foreground mb-6">
            <a href="#" className="hover:text-accent transition-colors">
              WhatsApp Chat Button
            </a>
            <span className="text-muted-foreground/50">·</span>
            <a href="#" className="hover:text-accent transition-colors">
              Contact Form for Website
            </a>
            <span className="text-muted-foreground/50">·</span>
            <a href="#" className="hover:text-accent transition-colors">
              ChatGPT Bots for Website
            </a>
          </div>
          <div className="flex justify-center items-center gap-3 text-sm text-muted-foreground">
            <p>&copy; 2025 GetButton Apps Oy</p>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0077b5] hover:opacity-80 transition-opacity"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
