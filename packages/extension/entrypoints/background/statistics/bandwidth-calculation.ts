import type { UrlSchema } from "@bandwidth-saver/shared";
import { DEFAULT_ASSET_STATISTICS } from "@/models/storage";
import { DUMMY_TAB_URL, MessageType } from "@/shared/constants";
import { onMessage } from "@/shared/messaging";
import {
	getSiteScopedStatisticsStorageItem,
	statisticsStorageItem,
} from "@/shared/storage";
import type { BandwidthMonitoringMessagePayload } from "@/shared/types";
import { getUrlSchemaOrigin } from "@/utils/url";

const DELAY_TILL_RAW_DATA_PROCESSING_IN_MS = 1000;

type BandwidthRawDataFromMessages = {
	perfApi: Readonly<BandwidthMonitoringMessagePayload | null>;
	webRequest: Readonly<BandwidthMonitoringMessagePayload | null>;
	timerId?: number | null;
};

const bandwidthRawDataMap = new Map<UrlSchema, BandwidthRawDataFromMessages>();

async function storeBandwidthDataFromPayload(
	data: BandwidthMonitoringMessagePayload,
	globalStore: Awaited<ReturnType<typeof statisticsStorageItem.getValue>>,
	siteScopedStore: Awaited<
		ReturnType<
			Awaited<ReturnType<typeof getSiteScopedStatisticsStorageItem>>["getValue"]
		>
	>,
) {
	const { bytes, type, assetUrl, hostOrigin } = data;

	const assetSize = bytes[type];

	if (!assetSize) return;

	globalStore.bytesUsed[type] += assetSize;
	globalStore.requestsMade++;

	const globalStatisticsSavePromise =
		statisticsStorageItem.setValue(globalStore);

	siteScopedStore.bytesUsed[type] += assetSize;
	siteScopedStore.requestsMade++;

	const assetUrlOrigin = getUrlSchemaOrigin(assetUrl);

	if (hostOrigin !== assetUrlOrigin) {
		const crossOriginData =
			siteScopedStore.crossOrigin[assetUrlOrigin] ?? DEFAULT_ASSET_STATISTICS;
		crossOriginData[type] += assetSize;
		siteScopedStore.crossOrigin[assetUrlOrigin] = crossOriginData;
	}

	const siteScopedStatisticsSavePromise =
		getSiteScopedStatisticsStorageItem(hostOrigin).setValue(siteScopedStore);

	await Promise.all([
		globalStatisticsSavePromise,
		siteScopedStatisticsSavePromise,
	]);

	// Remove any cached raw data for this URL (we've persisted the measurement)
	bandwidthRawDataMap.delete(assetUrl);
}

/**
 * Process cached raw data for a given URL entry immediately.
 * The callers schedule this with setTimeout; we intentionally do
 * not wrap this function in another timeout to allow callers to
 * implement debouncing per-URL.
 */
async function processCachedBandwidthData(
	storage: typeof bandwidthRawDataMap,
	urlEntry: UrlSchema,
) {
	const rawDataEntry = storage.get(urlEntry);

	if (!rawDataEntry) return;

	// clear stored timerId on the entry (if any) so we don't try to clear it later
	if (rawDataEntry.timerId) {
		rawDataEntry.timerId = null;
		storage.set(urlEntry, rawDataEntry);
	}

	const rawData = storage.get(urlEntry);
	if (!rawData) return;

	const { perfApi, webRequest } = rawData;

	if (!perfApi && !webRequest) return;

	const hostOrigin =
		(webRequest?.hostOrigin || perfApi?.hostOrigin) ?? DUMMY_TAB_URL;

	const [globalStatisticsValue, siteStatisticsValue] = await Promise.all([
		statisticsStorageItem.getValue(),
		getSiteScopedStatisticsStorageItem(
			getUrlSchemaOrigin(hostOrigin),
		).getValue(),
	]);

	if (perfApi && webRequest) {
		// Prioritize the webRequest's type and the perfApi's size when present
		const { type } = webRequest;

		const data: BandwidthMonitoringMessagePayload = {
			assetUrl: urlEntry,
			bytes: {
				...DEFAULT_ASSET_STATISTICS,
				[type]: perfApi.bytes[type] || webRequest.bytes[type],
			},
			hostOrigin: webRequest.hostOrigin || perfApi.hostOrigin,
			type,
		};

		await storeBandwidthDataFromPayload(
			data,
			globalStatisticsValue,
			siteStatisticsValue,
		);
	} else if (perfApi) {
		await storeBandwidthDataFromPayload(
			perfApi,
			globalStatisticsValue,
			siteStatisticsValue,
		);
	} else if (webRequest) {
		await storeBandwidthDataFromPayload(
			webRequest,
			globalStatisticsValue,
			siteStatisticsValue,
		);
	} else {
		// nothing to process
		return;
	}
}

function cacheBandwidthDataFromPerformanceApi(
	storage: typeof bandwidthRawDataMap,
) {
	onMessage(MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API, ({ data }) => {
		const { assetUrl: url } = data;
		const prevMapData = storage.get(url);

		const base = prevMapData ?? {
			perfApi: null,
			timerId: null,
			webRequest: null,
		};

		// clear any pending timer so we debounce per-URL
		if (base.timerId) {
			try {
				clearTimeout(base.timerId);
			} catch {}
		}

		const newEntry: BandwidthRawDataFromMessages = {
			...base,
			perfApi: data,
			timerId: null,
		};

		// schedule processing after the configured delay
		const timerId = setTimeout(() => {
			processCachedBandwidthData(storage, url);
		}, DELAY_TILL_RAW_DATA_PROCESSING_IN_MS) as unknown as number;

		newEntry.timerId = timerId;

		storage.set(url, newEntry);
	});
}

/** Since background can't message background, we'll export htis and call it elsewhere */
export function cacheBandwidthDataFromWebRequest(
	data: BandwidthMonitoringMessagePayload,
	storage = bandwidthRawDataMap,
) {
	const { assetUrl: url } = data;
	const prevMapData = storage.get(url);

	const base = prevMapData ?? {
		perfApi: null,
		timerId: null,
		webRequest: null,
	};

	// clear any pending timer so we debounce per-URL
	if (base.timerId) {
		try {
			clearTimeout(base.timerId);
		} catch {}
	}

	const newEntry: BandwidthRawDataFromMessages = {
		...base,
		timerId: null,
		webRequest: data,
	};

	// schedule processing after the configured delay
	const timerId = setTimeout(() => {
		processCachedBandwidthData(storage, url);
	}, DELAY_TILL_RAW_DATA_PROCESSING_IN_MS) as unknown as number;

	newEntry.timerId = timerId;

	storage.set(url, newEntry);
}

export function processMonitoredBandwidthData() {
	cacheBandwidthDataFromPerformanceApi(bandwidthRawDataMap);
}
