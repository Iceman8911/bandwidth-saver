import { monitorBandwidthUsageViaContentScript } from "./statistics/bandwidth-monitoring";

export default defineContentScript({
	main() {
		monitorBandwidthUsageViaContentScript();
	},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
