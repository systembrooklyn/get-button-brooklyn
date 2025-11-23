"use client";

export default function FloatingButton({ button, platform, index = 0 }) {
  if (!platform) return null;

  const Icon = platform.icon;

  const handleClick = () => {
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

  // Stack buttons vertically with more breathing room to prevent overlap
  // Base is 100px from bottom.
  // Increased gap from 65px to 80px to ensure separation.
  const bottomPosition = 10 + index * 80;

  return (
    <button
      onClick={handleClick}
      className="fixed right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300 z-50 hover:shadow-2xl group animate-in slide-in-from-bottom-4 fade-in border-2 border-white/20"
      style={{
        backgroundColor: platform.color,
        bottom: `${bottomPosition}px`,
        animationDelay: `${index * 100}ms`,
      }}
    >
      <Icon className="w-7 h-7 text-white" />

      {/* Tooltip on hover */}
      <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground text-xs font-semibold py-1.5 px-3 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none translate-x-2 group-hover:translate-x-0 border border-border">
        {platform.name}
      </span>
    </button>
  );
}
