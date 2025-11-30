const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Increase limit to handle Base64 file uploads
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default config;
