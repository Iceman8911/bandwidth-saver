import InlineEnum from "@iceman8911/unplugin-inline-enum/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	manifest: {
		author: { email: "wuchijss3@gmail.com" },
		description:
			"MV3-compatible browser extension for monitoring and reducing bandwidth usage online",
		host_permissions: ["<all_urls>"],
		name: "Bandwidth Saver & Monitor",
		permissions: [
			"webRequest",
			"declarativeNetRequest",
			"declarativeNetRequestWithHostAccess",
			"storage",
			"tabs",
		],
		short_name: "Bandwidth Saver",
		version: "0.0.1",
	},
	modules: ["@wxt-dev/module-solid", "@wxt-dev/auto-icons"],
	vite: () => ({
		plugins: [
			tailwindcss(),
			process.env.NODE_ENV === "production" ? InlineEnum() : [],
		],
	}),
});
