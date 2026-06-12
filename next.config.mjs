/** @type {import('next').NextConfig} */
const nextConfig = {
  // In-browser ML packages are loaded dynamically on the client; keep them
  // out of the server bundle entirely.
  serverExternalPackages: ['@huggingface/transformers', '@imgly/background-removal'],
  images: {
    // upcitemdb metadata images live on arbitrary retailer CDNs and user
    // photos on Supabase Storage; both render with plain <img>.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
