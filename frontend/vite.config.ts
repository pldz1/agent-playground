import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    // 允许通过 IP / 域名访问（而不是仅 localhost）
    host: true,

    // 如果你在 Docker / 远程机器 / 局域网访问，这是关键
    hmr: {
      host: "localhost", // 或你的真实域名 / IP
      protocol: "ws",
    },

    // 可选：固定端口，避免每次变化
    port: 5173,
  },
});
