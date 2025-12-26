import {
	clone,
	getDayStartInMillisecondsUTC,
	ImageCompressorEndpoint,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import {
	DEFAULT_COMBINED_ASSET_STATISTICS,
	DEFAULT_SINGLE_ASSET_STATISTICS,
} from "@/models/storage";
import {
	DUMMY_TAB_URL,
	MAX_DAYS_OF_DAILY_STATISTICS,
	MessageType,
} from "@/shared/constants";
import { onMessage } from "@/shared/messaging";
import {
	getSiteSpecificStatisticsStorageItem,
	statisticsStorageItem,
} from "@/shared/storage";
import type { BandwidthMonitoringMessagePayload } from "@/shared/types";
import { getUrlSchemaOrigin } from "@/utils/url";

const DELAY_TILL_RAW_DATA_PROCESSING_IN_MS = 1000;

const IMAGE_COMPRESSOR_ENDPOINTS: ReadonlyArray<string> = Object.values(
	ImageCompressorEndpoint,
);

type BandwidthRawDataFromMessages = {
	perfApi: Readonly<BandwidthMonitoringMessagePayload | null>;
	webRequest: Readonly<BandwidthMonitoringMessagePayload | null>;
	timerId?: number | null;
};

const bandwidthRawDataMap = new Map<UrlSchema, BandwidthRawDataFromMessages>();

/** Returns the overload of keys that don't fit within the limit */
function getOverloadDailyStatsKeys(
	dailyStats: typeof DEFAULT_COMBINED_ASSET_STATISTICS.dailyStats,
): number[] {
	const rawDays: ReadonlyArray<string> = Object.keys(dailyStats);

	if (rawDays.length <= MAX_DAYS_OF_DAILY_STATISTICS) return [];

	/** Ascending order is used so the oldest entries are at the beginning and can be easily sliced */
	const sortedDays: ReadonlyArray<number> = rawDays
		.map(Number)
		.sort((a, b) => a - b);

	const overloadDayCount = rawDays.length - MAX_DAYS_OF_DAILY_STATISTICS;

	return sortedDays.slice(0, overloadDayCount);
}

function processAggregateAndDailyStatsFromCombinedStatisticsForDay(arg: {
	combinedStats: Readonly<typeof DEFAULT_COMBINED_ASSET_STATISTICS>;
	day: number;
	type: keyof typeof DEFAULT_SINGLE_ASSET_STATISTICS;
	valueToAdd: number;
}): typeof DEFAULT_COMBINED_ASSET_STATISTICS {
	const { valueToAdd, combinedStats: oldCombinedStats, day, type } = arg;

	/** Clone since it's readonly */
	const newCombinedStats = clone(oldCombinedStats);

	const dailyStats = {
		...newCombinedStats.dailyStats,
		[day]: {
			...DEFAULT_SINGLE_ASSET_STATISTICS,
			...newCombinedStats.dailyStats[day],
			[type]: (newCombinedStats.dailyStats[day]?.[type] ?? 0) + valueToAdd,
		},
	};

	// Prevent overloads
	for (const overloadKey of getOverloadDailyStatsKeys(dailyStats)) {
		const overloadStats =
			dailyStats[overloadKey] ?? DEFAULT_SINGLE_ASSET_STATISTICS;

		let key: keyof typeof overloadStats;

		for (key in overloadStats) {
			newCombinedStats.aggregate[key] += overloadStats[key];
		}

		// I think this will tank perf, but until wxt supports custom transforms, this'll have to do
		delete dailyStats[overloadKey];
	}

	newCombinedStats.dailyStats = dailyStats;

	return newCombinedStats;
}

async function storeBandwidthDataFromPayload(
	data: BandwidthMonitoringMessagePayload,
	globalStore: Awaited<ReturnType<typeof statisticsStorageItem.getValue>>,
	siteScopedStore: Awaited<
		ReturnType<
			Awaited<
				ReturnType<typeof getSiteSpecificStatisticsStorageItem>
			>["getValue"]
		>
	>,
) {
	const { bytes, type, assetUrl, hostOrigin } = data;

	const assetSize = bytes[type];

	if (!assetSize) return;

	const day = getDayStartInMillisecondsUTC();

	globalStore.bytesUsed =
		processAggregateAndDailyStatsFromCombinedStatisticsForDay({
			combinedStats: globalStore.bytesUsed,
			day,
			type,
			valueToAdd: assetSize,
		});

	globalStore.requestsMade++;

	const globalStatisticsSavePromise =
		statisticsStorageItem.setValue(globalStore);

	siteScopedStore.bytesUsed =
		processAggregateAndDailyStatsFromCombinedStatisticsForDay({
			combinedStats: siteScopedStore.bytesUsed,
			day,
			type,
			valueToAdd: assetSize,
		});

	siteScopedStore.requestsMade++;

	const assetUrlOrigin = getUrlSchemaOrigin(assetUrl);

	if (hostOrigin !== assetUrlOrigin) {
		const crossOriginData =
			siteScopedStore.crossOrigin[assetUrlOrigin] ??
			DEFAULT_COMBINED_ASSET_STATISTICS;

		siteScopedStore.crossOrigin[assetUrlOrigin] =
			processAggregateAndDailyStatsFromCombinedStatisticsForDay({
				combinedStats: crossOriginData,
				day,
				type,
				valueToAdd: assetSize,
			});
	}

	// TODO: This may result in false positives if this compressor endpoints ccan be accessed as functional websites
	if (IMAGE_COMPRESSOR_ENDPOINTS.includes(assetUrlOrigin)) {
		globalStore.requestsCompressed =
			processAggregateAndDailyStatsFromCombinedStatisticsForDay({
				combinedStats: globalStore.requestsCompressed,
				day,
				type,
				valueToAdd: 1,
			});
		siteScopedStore.requestsCompressed =
			processAggregateAndDailyStatsFromCombinedStatisticsForDay({
				combinedStats: siteScopedStore.requestsCompressed,
				day,
				type,
				valueToAdd: 1,
			});
	}

	const siteScopedStatisticsSavePromise =
		getSiteSpecificStatisticsStorageItem(hostOrigin).setValue(siteScopedStore);

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
		getSiteSpecificStatisticsStorageItem(
			getUrlSchemaOrigin(hostOrigin),
		).getValue(),
	]);

	if (perfApi && webRequest) {
		// Prioritize the webRequest's type and the perfApi's size when present
		const { type } = webRequest;

		const data: BandwidthMonitoringMessagePayload = {
			assetUrl: urlEntry,
			bytes: {
				...DEFAULT_SINGLE_ASSET_STATISTICS,
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
