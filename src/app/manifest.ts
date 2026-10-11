import type { MetadataRoute } from "next"

// Lets staff "Add to Home Screen": the app opens full-screen like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Gintong Araw CDA",
    short_name: "Gintong Araw",
    description: "Member records, ID cards and meeting attendance for Gintong Araw CDA.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f3ee",
    theme_color: "#f4f3ee",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Capture attendance",
        url: "/attendance/capture",
        icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }],
      },
      { name: "Members", url: "/members", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
    ],
  }
}
