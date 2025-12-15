import type { UrlSchema } from "@bandwidth-saver/shared";
import { getActiveTabUrl } from "@/shared/constants";
import {
	disableAutoplayFromMutationObserver,
	disableAutoplayOnPageLoad,
} from "./autoplay";
import { fixImageElementsBrokenFromFailedCompression } from "./compression-patch";
import {
	disablePrefetchFromMutationObserver,
	disablePrefetchOnPageLoad,
} from "./prefetch";
import { monitorBandwidthUsageViaContentScript } from "./statistics/bandwidth-monitoring";

// Add all mutation observer stuff here
const observer = (pageUrl: UrlSchema) =>
	new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach((node) => {
					disableAutoplayFromMutationObserver(node, pageUrl);
					disablePrefetchFromMutationObserver(node, pageUrl);
				});
			}
		}
	});

export default defineContentScript({
	async main() {
		const PAGE_URL = await getActiveTabUrl();

		monitorBandwidthUsageViaContentScript();

		fixImageElementsBrokenFromFailedCompression(PAGE_URL);

		disableAutoplayOnPageLoad(PAGE_URL);

		disablePrefetchOnPageLoad(PAGE_URL);

		// Start observing the document for added nodes
		observer(PAGE_URL).observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
