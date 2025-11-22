"use client";

export default function FloatingButton({ button, platform }) {
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
      default:
        url = "#";
    }
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 animate-in fade-in slide-in-from-bottom-8"
      style={{ backgroundColor: platform.color }}
    >
      <Icon className="w-8 h-8 text-white" />
    </button>
  );
}
