import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";
import { readdirSync, statSync } from "fs";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const srcDir = resolve(__dirname, "src");
	const outDir = resolve(__dirname, "../app/static/plugins");

	// Dynamically find all directories in src/ to use as entry points
	const entries: Record<string, string> = {};
	const plugins = readdirSync(srcDir);

	for (const plugin of plugins) {
		const path = resolve(srcDir, plugin);
		if (statSync(path).isDirectory()) {
			const entryFile = resolve(path, "index.ts");
			entries[plugin] = entryFile;
		}
	}

	return {
		define: {
			__RELAY_ADDRESS__: JSON.stringify(env.RELAY_ADDRESS || "ws://localhost:3088/v1/connect"),
		},
		build: {
			outDir,
			emptyOutDir: false, // Don't wipe other plugins (like life-support.js)
			lib: {
				entry: entries,
				formats: ["iife"],
				name: "FurnarchyPlugin_[name]",
				fileName: (format, name) => `${name}.js`,
			},
			rollupOptions: {
				output: {
					// Ensure each plugin is a self-contained IIFE that doesn't pollute global scope
					// except for what it needs to register.
					extend: true,
				},
			},
			minify: false, // Keep it readable for now
		},
	};
});
