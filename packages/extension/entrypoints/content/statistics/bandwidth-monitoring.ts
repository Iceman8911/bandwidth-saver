import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { PerformanceResourceTimingIntiatorTypeSchema } from "@/models/native-types";
import type { SingleAssetStatisticsSchema } from "@/models/storage";
import { MessageType } from "@/shared/constants";
import { sendMessage } from "@/shared/messaging";
import { detectAssetTypeFromUrl, getUrlSchemaOrigin } from "@/utils/url";

const FLUSH_INTERVAL_MS = 500;
const FLUSH_TIME_BUDGET_MS = 8;

type PendingBandwidthDelta = {
	assetUrl: UrlSchema;
	hostOrigin: UrlSchema;
	type: keyof SingleAssetStatisticsSchema;
	bytes: number;
};

const pendingDeltasByAssetUrl = new Map<UrlSchema, PendingBandwidthDelta>();

function readHostOrigin(): UrlSchema {
	// @ts-expect-error location.origin is always a valid URL origin
	return getUrlSchemaOrigin(location.origin);
}

function detectAssetTypeFromInitiatorOrUrl(
	initiatorType: string,
	assetUrl: string,
): keyof SingleAssetStatisticsSchema {
	const parsedInitiatorType = v.parse(
		PerformanceResourceTimingIntiatorTypeSchema,
		initiatorType,
	);

	switch (parsedInitiatorType) {
		case "audio":
			return "audio";
		case "css":
			return "style";
		case "image":
		case "img":
		case "icon":
		case "input":
			return "image";
		case "script":
			return "script";
		case "video":
			return "video";
		case "link":
			return "style";
		case "navigation":
		case "frame":
		case "iframe":
			return "html";
		default:
			return detectAssetTypeFromUrl(new URL(assetUrl));
	}
}

function queueTransferSizeFromEntry(
	entry: PerformanceResourceTiming,
	hostOrigin: UrlSchema,
) {
	if (entry.transferSize <= 0) return;

	const assetUrl = v.parse(UrlSchema, entry.name);
	const assetType = detectAssetTypeFromInitiatorOrUrl(
		entry.initiatorType,
		entry.name,
	);

	const existing = pendingDeltasByAssetUrl.get(assetUrl);

	if (existing) {
		existing.bytes += entry.transferSize;
		pendingDeltasByAssetUrl.set(assetUrl, existing);
		return;
	}

	pendingDeltasByAssetUrl.set(assetUrl, {
		assetUrl,
		bytes: entry.transferSize,
		hostOrigin,
		type: assetType,
	});
}

function flushPendingBandwidthDeltas() {
	if (!pendingDeltasByAssetUrl.size) return;

	const flushStartMs = Date.now();

	while (Date.now() - flushStartMs < FLUSH_TIME_BUDGET_MS) {
		const nextEntry = pendingDeltasByAssetUrl.entries().next().value;

		if (!nextEntry) return;

		const [assetUrl, delta] = nextEntry;

		sendMessage(MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API, {
			assetUrl: delta.assetUrl,
			bytes: delta.bytes,
			hostOrigin: delta.hostOrigin,
			type: delta.type,
		});

		pendingDeltasByAssetUrl.delete(assetUrl);
	}
}

setInterval(flushPendingBandwidthDeltas, FLUSH_INTERVAL_MS);

const observer = new PerformanceObserver((list) => {
	const hostOrigin = readHostOrigin();

	for (const entry of list.getEntries()) {
		if (entry instanceof PerformanceResourceTiming) {
			queueTransferSizeFromEntry(entry, hostOrigin);
		}
	}
});

export function monitorBandwidthUsageViaContentScript() {
	observer.observe({ buffered: true, type: "resource" });

	const cleanup = () => {
		try {
			observer.disconnect();
		} catch {}
		window.removeEventListener("pagehide", cleanup, true);
	};

	window.addEventListener("pagehide", cleanup, true);
}
