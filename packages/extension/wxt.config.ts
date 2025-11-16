import tailwindcss from "@tailwindcss/vite";
import InlineEnum from "unplugin-inline-enum/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-solid"],
	vite: () => ({ plugins: [tailwindcss(), InlineEnum()] }),
	manifest: {
		permissions: [
			"declarativeNetRequest",
			"declarativeNetRequestWithHostAccess",
		],
		host_permissions: ["<all_urls>"],
	},
});
