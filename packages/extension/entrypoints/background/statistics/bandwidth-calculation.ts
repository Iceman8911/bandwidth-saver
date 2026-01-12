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

const URL_ENTRY_SETTLE_MS = 900;
const URL_ENTRY_MAX_AGE_MS = 3000;

const FLUSH_INTERVAL_MS = 500;
const FLUSH_TIME_BUDGET_MS = 8;

const IMAGE_COMPRESSOR_ENDPOINTS: ReadonlyArray<string> = Object.values(
	ImageCompressorEndpoint,
);

type BandwidthRawDataPayload = {
	perfApi: Readonly<BandwidthMonitoringMessagePayload | null>;
	webRequest: Readonly<BandwidthMonitoringMessagePayload | null>;

	firstSeenAtMs: number;
	lastUpdatedAtMs: number;
};

type CombinedStatsStoreValue = Awaited<
	ReturnType<typeof statisticsStorageItem.getValue>
>;
type SiteStatsStoreValue = Awaited<
	ReturnType<
		Awaited<ReturnType<typeof getSiteSpecificStatisticsStorageItem>>["getValue"]
	>
>;

const pendingBandwidthMeasurementsByUrl = new Map<
	UrlSchema,
	BandwidthRawDataPayload
>();
const dirtyAssetUrls = new Set<UrlSchema>();

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

function applyBandwidthDataToStores(
	data: BandwidthMonitoringMessagePayload,
	globalStore: CombinedStatsStoreValue,
	siteScopedStore: SiteStatsStoreValue,
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

	globalStore.requestsMade =
		processAggregateAndDailyStatsFromCombinedStatisticsForDay({
			combinedStats: globalStore.requestsMade,
			day,
			type,
			valueToAdd: 1,
		});

	siteScopedStore.bytesUsed =
		processAggregateAndDailyStatsFromCombinedStatisticsForDay({
			combinedStats: siteScopedStore.bytesUsed,
			day,
			type,
			valueToAdd: assetSize,
		});

	siteScopedStore.requestsMade =
		processAggregateAndDailyStatsFromCombinedStatisticsForDay({
			combinedStats: siteScopedStore.requestsMade,
			day,
			type,
			valueToAdd: 1,
		});

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
}

function createMergedPayload(
	urlEntry: UrlSchema,
	entry: BandwidthRawDataPayload,
): BandwidthMonitoringMessagePayload | null {
	const { perfApi, webRequest } = entry;

	if (!perfApi && !webRequest) return null;

	if (perfApi && webRequest) {
		const { type } = webRequest;

		return {
			assetUrl: urlEntry,
			bytes: {
				...DEFAULT_SINGLE_ASSET_STATISTICS,
				[type]: perfApi.bytes[type] || webRequest.bytes[type],
			},
			hostOrigin: webRequest.hostOrigin || perfApi.hostOrigin,
			type,
		};
	}

	return (perfApi ?? webRequest) || null;
}

function readUrlHostOrigin(entry: BandwidthRawDataPayload): UrlSchema {
	const hostOrigin =
		(entry.webRequest?.hostOrigin || entry.perfApi?.hostOrigin) ??
		DUMMY_TAB_URL;

	return getUrlSchemaOrigin(hostOrigin) as UrlSchema;
}

function takeFlushableUrls(nowMs: number): UrlSchema[] {
	const urls: UrlSchema[] = [];

	for (const url of dirtyAssetUrls) {
		const entry = pendingBandwidthMeasurementsByUrl.get(url);
		if (!entry) {
			dirtyAssetUrls.delete(url);
			continue;
		}

		if (!shouldFlushUrlEntry(entry, nowMs)) continue;

		dirtyAssetUrls.delete(url);
		urls.push(url);
	}

	return urls;
}

async function flushBandwidthMeasurementsOnce() {
	const nowMs = Date.now();
	const urlsToFlush = takeFlushableUrls(nowMs);

	if (urlsToFlush.length === 0) return;

	const globalStore = await statisticsStorageItem.getValue();

	const siteStoresByOrigin = new Map<
		UrlSchema,
		{
			storageItem: ReturnType<typeof getSiteSpecificStatisticsStorageItem>;
			value: SiteStatsStoreValue;
		}
	>();

	for (const urlEntry of urlsToFlush) {
		const entry = pendingBandwidthMeasurementsByUrl.get(urlEntry);
		if (!entry) continue;

		const data = createMergedPayload(urlEntry, entry);
		if (!data) {
			pendingBandwidthMeasurementsByUrl.delete(urlEntry);
			continue;
		}

		const siteOrigin = readUrlHostOrigin(entry);

		let siteStore = siteStoresByOrigin.get(siteOrigin);
		if (!siteStore) {
			const storageItem = getSiteSpecificStatisticsStorageItem(siteOrigin);
			const value = await storageItem.getValue();
			siteStore = { storageItem, value };
			siteStoresByOrigin.set(siteOrigin, siteStore);
		}

		applyBandwidthDataToStores(data, globalStore, siteStore.value);

		pendingBandwidthMeasurementsByUrl.delete(urlEntry);
	}

	const savePromises: Array<Promise<unknown>> = [
		statisticsStorageItem.setValue(globalStore),
	];

	for (const { storageItem, value } of siteStoresByOrigin.values()) {
		savePromises.push(storageItem.setValue(value));
	}

	await Promise.all(savePromises);
}

function shouldFlushUrlEntry(
	entry: BandwidthRawDataPayload,
	nowMs: number,
): boolean {
	if (!entry.perfApi && !entry.webRequest) return false;

	const ageMs = nowMs - entry.firstSeenAtMs;
	const quietMs = nowMs - entry.lastUpdatedAtMs;

	if (ageMs >= URL_ENTRY_MAX_AGE_MS) return true;
	if (quietMs >= URL_ENTRY_SETTLE_MS) return true;

	return false;
}

function createNewBandwidthRawDataPayload(
	nowMs: number,
): BandwidthRawDataPayload {
	return {
		firstSeenAtMs: nowMs,
		lastUpdatedAtMs: nowMs,
		perfApi: null,
		webRequest: null,
	};
}

export function cacheBandwidthDataFromPerformanceApi() {
	onMessage(MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API, ({ data }) => {
		const { assetUrl } = data;

		const nowMs = Date.now();
		const previousEntry =
			pendingBandwidthMeasurementsByUrl.get(assetUrl) ??
			createNewBandwidthRawDataPayload(nowMs);

		const updatedEntry: BandwidthRawDataPayload = {
			...previousEntry,
			lastUpdatedAtMs: nowMs,
			perfApi: data,
		};

		pendingBandwidthMeasurementsByUrl.set(assetUrl, updatedEntry);
		dirtyAssetUrls.add(assetUrl);
	});
}

/** Since background can't message background, we'll export htis and call it elsewhere */
export function cacheBandwidthDataFromWebRequest(
	data: BandwidthMonitoringMessagePayload,
) {
	const { assetUrl } = data;

	const nowMs = Date.now();
	const previousEntry =
		pendingBandwidthMeasurementsByUrl.get(assetUrl) ??
		createNewBandwidthRawDataPayload(nowMs);

	const updatedEntry: BandwidthRawDataPayload = {
		...previousEntry,
		lastUpdatedAtMs: nowMs,
		webRequest: data,
	};

	pendingBandwidthMeasurementsByUrl.set(assetUrl, updatedEntry);
	dirtyAssetUrls.add(assetUrl);
}

let isFlushInProgress = false;

setInterval(() => {
	const flushStartMs = Date.now();

	if (isFlushInProgress) return;
	isFlushInProgress = true;

	void (async () => {
		while (Date.now() - flushStartMs < FLUSH_TIME_BUDGET_MS) {
			await flushBandwidthMeasurementsOnce();
			if (dirtyAssetUrls.size === 0) return;
		}
	})().finally(() => {
		isFlushInProgress = false;
	});
}, FLUSH_INTERVAL_MS);
