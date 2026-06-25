import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  async redirects() {
    return [
      {
        source: "/properties",
        destination: "/items",
        permanent: true
      },
      {
        source: "/properties/:id",
        destination: "/items/:id",
        permanent: true
      },
      {
        source: "/add-property",
        destination: "/add-item",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
