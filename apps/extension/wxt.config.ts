import InlineEnum from "@iceman8911/unplugin-inline-enum/vite";
import tailwindcss from "@tailwindcss/vite";
import lucidePreprocess from "vite-plugin-lucide-preprocess";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	manifest: {
		author: { email: "wuchijss3@gmail.com" },
		description:
			"MV3-compatible browser extension for monitoring and reducing bandwidth usage online",
		host_permissions: ["<all_urls>"],
		name: "Bandwidth Saver And Monitor",
		permissions: [
			"webRequest",
			"declarativeNetRequest",
			"declarativeNetRequestWithHostAccess",
			"storage",
			"activeTab",
			"alarms",
		],
		short_name: "Bandwidth Saver And Monitor",
		version: "0.0.1",
	},
	modules: ["@wxt-dev/module-solid", "@wxt-dev/auto-icons"],
	vite: () => ({
		plugins: [
			lucidePreprocess(),
			tailwindcss(),
			process.env.NODE_ENV === "production" ? InlineEnum() : [],
		],
	}),
	webExt: {
		// Stop the created chromium instance from flagging bots
		chromiumArgs: ["--disable-blink-features=AutomationControlled"],
	},
});
