import { BatchQueue, type UrlSchema } from "@bandwidth-saver/shared";
import type { PerformanceResourceTimingIntiatorTypeSchema } from "@/models/native-types";
import type { SingleAssetStatisticsSchema } from "@/models/storage";
import { MessageType } from "@/shared/constants";
import { sendExtensionMessage } from "@/shared/messaging/extension";
import { detectAssetTypeFromUrl, getUrlSchemaOrigin } from "@/utils/url";

type PerformanceResourceTimingPayload = {
	initiatorType: string;
	name: string;
	transferSize: number;
	hostOrigin: UrlSchema;
};

const pendingPerformanceResourceTimingPayloadBatchQueue =
	new BatchQueue<PerformanceResourceTimingPayload>({
		batchSize: 25,
		intervalMs: 750,
	});

pendingPerformanceResourceTimingPayloadBatchQueue.addCallbacks((details) => {
	for (const {
		hostOrigin,
		initiatorType,
		name: assetUrl,
		transferSize,
	} of details) {
		// 0 transferSize usually means it came from Cache or the request was missing a header
		if (transferSize > 0) {
			//@ts-expect-error No need to parse since this will always be true unless the web breaks or smth
			const parsedInitiatorType: PerformanceResourceTimingIntiatorTypeSchema =
				initiatorType;

			let assetSize = 0;

			// determine which asset key to increment
			let assetType: keyof SingleAssetStatisticsSchema = "other";

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
					assetType = detectAssetTypeFromUrl(assetUrl as UrlSchema);
					break;
			}

			assetSize += transferSize;

			sendExtensionMessage(MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API, {
				assetUrl: assetUrl as UrlSchema,
				bytes: assetSize,
				// No way to get the bytesSaved header via Performance Metrics
				bytesSaved: 0,
				hostOrigin,
				type: assetType,
			});
		}
	}
});

const observer = new PerformanceObserver((list) => {
	if (location.protocol.includes("extension")) return;

	const entries = list.getEntries();
	//@ts-expect-error This will always be a valid url since its da Web API
	const hostOrigin = getUrlSchemaOrigin(location.origin);

	for (const entry of entries) {
		if (entry instanceof PerformanceResourceTiming) {
			const { transferSize, initiatorType, name } = entry;

			pendingPerformanceResourceTimingPayloadBatchQueue.enqueue({
				hostOrigin,
				initiatorType,
				name,
				transferSize,
			});
		}
	}
});

export function monitorBandwidthUsageViaContentScript() {
	try {
		observer.disconnect();
	} catch {}

	observer.observe({ buffered: true, type: "resource" });
}
