import type { MetadataRoute } from "next";

// PWA manifest — this is a phone-first product; closet browsing lives on mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Knit — share your style",
    short_name: "Knit",
    description:
      "Your friends' and favorite creators' closets — rent, buy, or give away the actual pieces.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF6F2",
    theme_color: "#2A2230",
    icons: [
      // Single scalable mark (logo #2). Padded for maskable cropping.
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
