"use client";

import { useState } from "react";
import { X, MessageCircle, ChevronUp } from "lucide-react";

export default function FloatingButton({ buttons }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!buttons || buttons.length === 0) return null;

  const handleButtonClick = (button) => {
    const platform = button.platformData;
    if (!platform) return;

    let url = "";
    switch (button.platform) {
      case "whatsapp":
        url = `https://wa.me/${button.contact.replace(/[^0-9]/g, "")}`;
        break;
      case "telegram":
        url = `https://t.me/${button.contact.replace("@", "")}`;
        break;
      case "email":
        url = `mailto:${button.contact}`;
        break;
      case "messenger":
        url = `https://m.me/${button.contact}`;
        break;
      case "viber":
        url = `viber://chat?number=${button.contact.replace(/[^0-9]/g, "")}`;
        break;
      case "snapchat":
        url = `https://www.snapchat.com/add/${button.contact}`;
        break;
      default:
        url = "#";
    }
    window.open(url, "_blank");
  };

  // --- SINGLE BUTTON CASE ---
  // If only 1 button exists, show it directly (no toggle menu)
  if (buttons.length === 1) {
    const btn = buttons[0];
    const platform = btn.platformData;
    if (!platform) return null;
    const Icon = platform.icon;

    return (
      <button
        onClick={() => handleButtonClick(btn)}
        className="fixed right-6 bottom-6 w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300 z-50 hover:shadow-xl group border-2 border-white/20 animate-in slide-in-from-bottom-8 fade-in"
        style={{ backgroundColor: platform.color }}
      >
        <Icon className="w-8 h-8 text-white" />
        <span className="absolute right-20 bg-foreground text-background text-xs font-semibold py-1.5 px-3 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none translate-x-2 group-hover:translate-x-0">
          {platform.name}
        </span>
      </button>
    );
  }

  // --- MULTIPLE BUTTONS CASE ---
  // Show a toggle button that expands the list
  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      {/* Social Buttons List (Staggered Animation) */}
      <div
        className={`flex flex-col gap-3 items-end transition-all duration-300 ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-10 pointer-events-none"
        }`}
      >
        {buttons.map((btn, idx) => {
          const platform = btn.platformData;
          if (!platform) return null;
          const Icon = platform.icon;

          return (
            <button
              key={btn.id}
              onClick={() => handleButtonClick(btn)}
              className="w-12 h-12 rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform duration-200 group border border-white/10 relative"
              style={{
                backgroundColor: platform.color,
                transitionDelay: isOpen ? `${idx * 50}ms` : "0ms",
              }}
            >
              <Icon className="w-6 h-6 text-white" />

              {/* Tooltip */}
              <span className="absolute right-14 bg-popover text-popover-foreground border border-border text-xs font-medium py-1 px-2 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {platform.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 pointer-events-auto relative overflow-hidden bg-primary text-primary-foreground`}
      >
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
          }`}
        >
          <MessageCircle className="w-7 h-7" />
          {/* Small indicator badge for number of apps */}
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm border border-white">
            {buttons.length}
          </span>
        </div>
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
          }`}
        >
          <X className="w-7 h-7" />
        </div>
      </button>
    </div>
  );
}
