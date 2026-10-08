import type { NextConfig } from "next";

const nextConfig: NextConfig = {\n  async headers() {\n    const headers = [\n      { key: "X-Content-Type-Options", value: "nosniff" },\n      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },\n      { key: "X-Frame-Options", value: "DENY" },\n      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },\n    ];\n\n    if (process.env.NODE_ENV === "production") {\n      headers.push({\n        key: "Strict-Transport-Security",\n        value: "max-age=31536000; includeSubDomains",\n      });\n    }\n\n    return [{ source: "/(.*)", headers }];\n  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
