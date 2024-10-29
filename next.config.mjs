import CopyPlugin from "copy-webpack-plugin";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, options) => {
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
            from: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs",
            to: "static/chunks/[name][ext]",
          },
        ],
      })
    );
    return config;
  },
};

export default nextConfig;
