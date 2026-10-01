import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: false,
  // Mobile networks reconnect on resume; reloading here destroys in-memory UI.
  reloadOnOnline: false,
  globPublicPatterns: [
    "icons/*.png",
    "manifest.json",
    "brasao-*-256.png",
    "*-offline.html",
    "offline.html",
  ],
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ["pdfkit", "unpdf", "pdfjs-dist"],
    outputFileTracingIncludes: {
      "/api/jobs/schedule-processing": [
        "./src/modules/schedule-repository/infrastructure/pdf.worker.min.mjs",
      ],
      "/api/estagio/escala": ["./src/lib/reports/assets/internship-gbm-header-reference.png"],
      "/api/estagio/permanencia": ["./src/lib/reports/assets/internship-gbm-header-reference.png"],
    },
    serverActions: {
      bodySizeLimit: "11mb", // documentos até 10 MB + overhead multipart
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default withSerwist(nextConfig);
