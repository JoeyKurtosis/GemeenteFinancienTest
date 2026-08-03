import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

const backendUrl = process.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export default defineConfig({
    plugins: [TanStackRouterVite(), svgr(), react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            // Object form rather than the string shorthand so the SSE stream from
            // /api/chat/ has somewhere to declare its needs. Vite's proxy passes
            // responses through unbuffered, so this is mostly future-proofing.
            "/api": { target: backendUrl, changeOrigin: true },
            "/media": backendUrl,
        },
        watch: {
            usePolling: true,
        },
    },
});
