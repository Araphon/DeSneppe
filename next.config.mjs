/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: { serverComponentsExternalPackages: ['sharp', 'bcryptjs'] },
  async headers() {
    const h = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]
    if (process.env.NOINDEX === '1') h.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' })
    return [{ source: '/:path*', headers: h }]
  },
}
export default nextConfig
