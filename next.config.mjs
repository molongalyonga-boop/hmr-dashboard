/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow embedding in an intranet iframe.
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors *;" },
      ],
    }];
  },
};
export default nextConfig;
