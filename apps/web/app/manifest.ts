import type { MetadataRoute } from "next";

// PWA manifest — this is a phone-first product; closet browsing lives on mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Knit",
    short_name: "Knit",
    description: "Your friends' and favorite creators' closets — rent, buy, or give away the actual pieces.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF6F2",
    theme_color: "#2A2230",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
