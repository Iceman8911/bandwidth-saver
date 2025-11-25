import tailwindcss from "@tailwindcss/vite";
import InlineEnum from "unplugin-inline-enum/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	manifest: {
		host_permissions: ["<all_urls>"],
		permissions: [
			"webRequest",
			"declarativeNetRequest",
			"declarativeNetRequestWithHostAccess",
			"storage",
			"tabs",
		],
	},
	modules: ["@wxt-dev/module-solid"],
	vite: () => ({
		plugins: [
			tailwindcss(),
			process.env.NODE_ENV === "production" ? InlineEnum() : [],
		],
	}),
});
