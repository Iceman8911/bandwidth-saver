import tailwindcss from "@tailwindcss/vite";
import InlineEnum from "unplugin-inline-enum/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	manifest: {
		host_permissions: ["<all_urls>"],
		permissions: [
			"declarativeNetRequest",
			"declarativeNetRequestWithHostAccess",
			"storage",
		],
	},
	modules: ["@wxt-dev/module-solid"],
	vite: () => ({ plugins: [tailwindcss(), InlineEnum()] }),
});
