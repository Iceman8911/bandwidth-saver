import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { PerformanceResourceTimingIntiatorTypeSchema } from "@/models/native-types";
import { DEFAULT_ASSET_STATISTICS } from "@/models/storage";
import { MessageType } from "@/shared/constants";
import { sendMessage } from "@/shared/messaging";
import { detectAssetTypeFromUrl } from "@/shared/url";

const observer = new PerformanceObserver((list) => {
	const entries = list.getEntries();
	const hostOrigin = getUrlSchemaOrigin(v.parse(UrlSchema, location.origin));

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
				let assetType: keyof typeof assetSize = "other";

				switch (parsedInitiatorType) {
					case "audio":
						assetType = "audio";
						break;

					case "css":
						assetType = "style";
						break;

					case "image":
					case "img":
					case "icon":
					case "input":
						assetType = "image";
						break;

					case "script":
						assetType = "script";
						break;

					case "video":
						assetType = "video";
						break;

					case "link":
						// typically a stylesheet, but fallback to URL heuristics
						assetType = "style";
						break;

					case "navigation":
					case "frame":
					case "iframe":
						assetType = "html";
						break;
					default:
						assetType = detectAssetTypeFromUrl(new URL(name));
						break;
				}

				assetSize[assetType] += transferSize;

				sendMessage(MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API, {
					assetUrl: v.parse(UrlSchema, name),
					bytes: assetSize,
					hostOrigin,
					type: assetType,
				});
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
