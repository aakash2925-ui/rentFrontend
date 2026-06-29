import { siteDescription, siteName } from "@/lib/siteMetadata";

export default function manifest() {
  return {
    name: siteName,
    short_name: siteName,
    description: siteDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#11071f",
    theme_color: "#573875",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      },
      {
        src: "/zasoota-logo.svg",
        sizes: "512x512",
        type: "image/svg+xml"
      }
    ]
  };
}
