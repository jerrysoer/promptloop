import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["promptloop", "sharp"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Sharp optional native deps that may not exist at build time
      config.externals = config.externals || [];
      config.externals.push({
        "@img/sharp-libvips-dev/include": "commonjs @img/sharp-libvips-dev/include",
        "@img/sharp-libvips-dev/cplusplus": "commonjs @img/sharp-libvips-dev/cplusplus",
        "@img/sharp-wasm32/versions": "commonjs @img/sharp-wasm32/versions",
      });
    }
    return config;
  },
};

export default nextConfig;
