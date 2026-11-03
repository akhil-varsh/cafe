import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [{
      // Models are regenerated in place (names are not content-hashed), so cache for a day and
      // revalidate in the background rather than marking them immutable.
      source: '/models/:file*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        { key: 'Content-Type', value: 'model/gltf-binary' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ],
    }];
  },
};

export default nextConfig;
