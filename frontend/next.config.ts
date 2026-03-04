import type { NextConfig } from "next";

// Server-side rewrites need the Docker-internal URL (service name),
// not the browser-facing URL.
const backendInternalUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
    experimental: {
        allowedDevOrigins: ["venduce.com", "localhost"],
    },
    async rewrites() {
        return [
            {
                source: "/storage/:path*",
                destination: `${backendInternalUrl}/storage/:path*`,
            },
        ];
    },
};

export default nextConfig;
