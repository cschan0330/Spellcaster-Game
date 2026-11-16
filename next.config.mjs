/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async redirects() {
    return [{source: '/mnist', destination: '/', permanent: true}];
  },
};
export default nextConfig;
