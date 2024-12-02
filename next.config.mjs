import CopyPlugin from "copy-webpack-plugin";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    esmExternals: true, // 外部モジュールをESMとして扱う
  },
  webpack: (config, options) => {
    // MJSファイルの処理
    config.module.rules.push({
      test: /\.mjs$/,
      type: "javascript/auto",
    });

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true, // WASMの非同期読み込み
      topLevelAwait: true, // トップレベルでのawaitを許可
    };
    if (!options.isServer) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
              to: "../public/[name][ext]",
            },
            {
              from: "node_modules/@ricky0123/vad-web/dist/*.onnx",
              to: "../public/[name][ext]",
            },
            {
              from: "node_modules/onnxruntime-web/dist/*.wasm",
              to: "static/chunks/[name][ext]",
            },
            {
              from: "node_modules/kuromoji/dict/*",
              to: "../public/kuromoji/dict/[name][ext]",
            },
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;
