import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { sendMessage } from "webext-bridge/content-script";
import { PerformanceResourceTimingIntiatorTypeSchema } from "@/models/native-types";
import { DEFAULT_ASSET_STATISTICS } from "@/models/storage";
import { MessageType } from "@/shared/constants";
import { detectAssetTypeFromUrl } from "@/shared/url";

const observer = new PerformanceObserver((list) => {
	const entries = list.getEntries();

	for (const entry of entries) {
		if (entry instanceof PerformanceResourceTiming) {
			const { transferSize, initiatorType, name } = entry;

			// 0 transferSize usually means it came from Cache
			if (transferSize > 0) {
				const parsedInitiatorType = v.parse(
					PerformanceResourceTimingIntiatorTypeSchema,
					initiatorType,
				);

				const assetSize = { ...DEFAULT_ASSET_STATISTICS };

				// determine which asset key to increment
				let assetKey: keyof typeof assetSize = "other";

				switch (parsedInitiatorType) {
					case "audio":
						assetKey = "audio";
						break;

					case "css":
						assetKey = "style";
						break;

					case "image":
					case "img":
					case "icon":
					case "input":
						assetKey = "image";
						break;

					case "script":
						assetKey = "script";
						break;

					case "video":
						assetKey = "video";
						break;

					case "link":
						// typically a stylesheet, but fallback to URL heuristics
						assetKey = "style";
						break;

					case "navigation":
					case "frame":
					case "iframe":
						assetKey = "html";
						break;
					default:
						assetKey = detectAssetTypeFromUrl(new URL(name));
						break;
				}

				assetSize[assetKey] += transferSize;

				sendMessage(
					MessageType.MONITOR_BANDWIDTH,
					{ bytes: assetSize, url: v.parse(UrlSchema, name) },
					"background",
				);
			}
		}
	}
});

export function monitorBandwidthUsageViaContentScript() {
	observer.observe({ buffered: true, type: "resource" });

	// cleanup when the page is unloaded or navigated away from
	const cleanup = () => {
		try {
			observer.disconnect();
		} catch {}
		window.removeEventListener("pagehide", cleanup, true);
	};
	window.addEventListener("pagehide", cleanup, true);
}
