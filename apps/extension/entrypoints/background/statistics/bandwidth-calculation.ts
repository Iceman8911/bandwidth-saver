import {
	BatchQueue,
	clone,
	getDayStartInMillisecondsUTC,
	IMAGE_COMPRESSOR_ENDPOINT_SET,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import * as immer from "immer";
import { type Browser, browser } from "wxt/browser";
import {
	storage,
	type WxtStorage,
	type WxtStorageItem,
} from "wxt/utils/storage";
import {
	type CombinedAssetStatisticsSchema,
	DEFAULT_COMBINED_ASSET_STATISTICS,
	DEFAULT_SINGLE_ASSET_STATISTICS,
	type DetailedStatisticsSchema,
	type SingleAssetStatisticsSchema,
	type StatisticsSchema,
} from "@/models/storage";
import {
	ALARM_NAME,
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
import { getSiteUrlOrigins } from "@/utils/storage";
import { getUrlSchemaOrigin } from "@/utils/url";

const RAW_ENTRY_SETTLE_MS = 750;
const RAW_ENTRY_MAX_AGE_MS = 2500;

const FLUSH_BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 1000;

type StorageSetItemsArrayParam = Parameters<WxtStorage["setItems"]>[0];

type RawDataPayloadSource = "perfApi" | "webRequest";

/** Bandwidth data from mutiple sources that needs coalescing */
type BandwidthMonitioringRawDataPayload = {
	firstSeenAtMs: number;
	lastUpdatedAtMs: number;
} & Record<
	RawDataPayloadSource,
	Readonly<BandwidthMonitoringMessagePayload | null>
>;

type PendingBandwidthMeasurementMapClassOptions = {
	/** How long each individual timeout should be when triggered by `set` */
	timeoutMs: number;

	/** BatchQueue to push filled or overdue payloads into. */
	batchQueue: BatchQueue<BandwidthMonitoringMessagePayload>;

	/** If `Date.now()` - `lastUpdatedAtMs` > this, the entry is expired */
	settleAgeMs: number;

	/** If `Date.now()` - `firstSeenAtMs` > this, the entry is expired */
	maxAgeMs: number;
};

class PendingBandwidthMeasurementMap {
	private _map = new Map<UrlSchema, BandwidthMonitioringRawDataPayload>();
	private _timers = new Map<UrlSchema, ReturnType<typeof setTimeout>>();

	constructor(private _options: PendingBandwidthMeasurementMapClassOptions) {}

	private _isPayloadFilled(
		payload: BandwidthMonitioringRawDataPayload,
	): boolean {
		return !!(payload.perfApi && payload.webRequest);
	}

	private _isPayloadOverdue(
		payload: BandwidthMonitioringRawDataPayload,
	): boolean {
		const now = Date.now();

		return (
			now - payload.firstSeenAtMs > this._options.maxAgeMs ||
			now - payload.lastUpdatedAtMs > this._options.settleAgeMs
		);
	}

	private _clearTimer(url: UrlSchema): void {
		const t = this._timers.get(url);
		if (!t) return;
		clearTimeout(t);
		this._timers.delete(url);
	}

	private _schedule(url: UrlSchema): void {
		// If there is already a scheduled check, don’t stack another.
		if (this._timers.has(url)) return;

		const t = setTimeout(() => {
			// Timer has fired; remove handle first so we can reschedule if needed.
			this._timers.delete(url);
			this._tryToEnqueuePayload(url);
		}, this._options.timeoutMs);

		this._timers.set(url, t);
	}

	private _tryToEnqueuePayload(url: UrlSchema): void {
		const payload = this._map.get(url);

		// Entry may have been flushed/deleted already.
		if (!payload) {
			this._clearTimer(url);
			return;
		}

		if (this._isPayloadFilled(payload) || this._isPayloadOverdue(payload)) {
			// We’re done with this URL; ensure no further checks can fire.
			this._map.delete(url);
			this._clearTimer(url);

			const { perfApi, webRequest } = payload;

			if (perfApi || webRequest) {
				/** NOTE: The lasts defaults shouldn't ever happen :p */
				const merged: BandwidthMonitoringMessagePayload = {
					assetUrl: url,
					bytes: perfApi?.bytes || webRequest?.bytes || 0,
					hostOrigin:
						webRequest?.hostOrigin || perfApi?.hostOrigin || DUMMY_TAB_URL,
					type: webRequest?.type || perfApi?.type || "other",
				};

				this._options.batchQueue.enqueue(merged);
			}

			return;
		}

		// Not filled/overdue yet, so schedule exactly one future check.
		this._schedule(url);
	}

	get(url: UrlSchema): BandwidthMonitioringRawDataPayload | undefined {
		return this._map.get(url);
	}

	set(url: UrlSchema, payload: BandwidthMonitioringRawDataPayload): void {
		this._map.set(url, payload);

		// Ensure there will be a check, but don’t create duplicates.
		this._schedule(url);
	}
}

const pendingMergedBandwidthMeasurementBatchQueue =
	new BatchQueue<BandwidthMonitoringMessagePayload>({
		batchSize: FLUSH_BATCH_SIZE,
		intervalMs: FLUSH_INTERVAL_MS,
	});

const pendingRawBandwidthMeasurementsToCoalesce =
	new PendingBandwidthMeasurementMap({
		batchQueue: pendingMergedBandwidthMeasurementBatchQueue,
		maxAgeMs: RAW_ENTRY_MAX_AGE_MS,
		settleAgeMs: RAW_ENTRY_SETTLE_MS,
		timeoutMs: RAW_ENTRY_MAX_AGE_MS / 3,
	});

function createNewBandwidthRawDataPayload(
	nowMs: number,
): BandwidthMonitioringRawDataPayload {
	return {
		firstSeenAtMs: nowMs,
		lastUpdatedAtMs: nowMs,
		perfApi: null,
		webRequest: null,
	};
}

function cacheBandwidthDataFromSource(
	data: BandwidthMonitoringMessagePayload,
	src: RawDataPayloadSource,
) {
	const { assetUrl } = data;

	const nowMs = Date.now();

	let updatedEntry: BandwidthMonitioringRawDataPayload;

	const previousEntry = pendingRawBandwidthMeasurementsToCoalesce.get(assetUrl);

	if (previousEntry) {
		updatedEntry = previousEntry;
	} else {
		updatedEntry = createNewBandwidthRawDataPayload(nowMs);
	}

	updatedEntry.lastUpdatedAtMs = nowMs;
	updatedEntry[src] = data;

	pendingRawBandwidthMeasurementsToCoalesce.set(assetUrl, updatedEntry);
}

export function startCachingBandwidthDataFromPerformanceApi() {
	onMessage(MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API, ({ data }) =>
		cacheBandwidthDataFromSource(data, "perfApi"),
	);
}

export function cacheBandwidthDataFromWebRequest(
	data: BandwidthMonitoringMessagePayload,
) {
	cacheBandwidthDataFromSource(data, "webRequest");
}

/** Mutates and returns the same given `combinedStats` */
function updateDailyStatsInCombinedStats(arg: {
	combinedStats: CombinedAssetStatisticsSchema;
	day: number;
	type: keyof SingleAssetStatisticsSchema;
	valueToAdd: number;
}): CombinedAssetStatisticsSchema {
	const { valueToAdd, combinedStats, day, type } = arg;

	const { dailyStats } = combinedStats;

	if (!dailyStats[day])
		dailyStats[day] = clone(DEFAULT_SINGLE_ASSET_STATISTICS);

	dailyStats[day][type] += valueToAdd;

	return combinedStats;
}

function applyBandwidthMeasurementsToStatistics(
	data: BandwidthMonitoringMessagePayload,
	globalStats: StatisticsSchema,
	siteScopedStats: DetailedStatisticsSchema,
): {
	globalStats: StatisticsSchema;
	siteScopedStats: DetailedStatisticsSchema;
} {
	const { bytes: assetSize, type, assetUrl, hostOrigin } = data;

	if (!assetSize) return { globalStats, siteScopedStats };

	const day = getDayStartInMillisecondsUTC();

	const assetUrlOrigin = getUrlSchemaOrigin(assetUrl);

	const applyToCombinedStats = (
		combinedStats: CombinedAssetStatisticsSchema,
		valueToAdd: number,
	) =>
		updateDailyStatsInCombinedStats({
			combinedStats,
			day,
			type,
			valueToAdd,
		});

	const updatedGlobalStats = immer.produce(globalStats, (draft) => {
		draft.bytesUsed = applyToCombinedStats(draft.bytesUsed, assetSize);
		draft.requestsMade = applyToCombinedStats(draft.requestsMade, 1);

		if (IMAGE_COMPRESSOR_ENDPOINT_SET.has(assetUrlOrigin)) {
			draft.requestsCompressed = applyToCombinedStats(
				draft.requestsCompressed,
				1,
			);
		}
	});

	const updatedSiteScopedStats = immer.produce(siteScopedStats, (draft) => {
		draft.bytesUsed = applyToCombinedStats(draft.bytesUsed, assetSize);
		draft.requestsMade = applyToCombinedStats(draft.requestsMade, 1);

		if (hostOrigin !== assetUrlOrigin) {
			const existingCrossOrigin =
				draft.crossOrigin[assetUrlOrigin] ??
				clone(DEFAULT_COMBINED_ASSET_STATISTICS);

			draft.crossOrigin[assetUrlOrigin] = applyToCombinedStats(
				existingCrossOrigin,
				assetSize,
			);
		}

		if (IMAGE_COMPRESSOR_ENDPOINT_SET.has(assetUrlOrigin)) {
			draft.requestsCompressed = applyToCombinedStats(
				draft.requestsCompressed,
				1,
			);
		}
	});

	return {
		globalStats: updatedGlobalStats,
		siteScopedStats: updatedSiteScopedStats,
	};
}

pendingMergedBandwidthMeasurementBatchQueue.addCallbacks(
	async (measurements) => {
		let globalStats = await statisticsStorageItem.getValue();

		/** String keys are used over the storage item instances so it'll be easy for updated stats with the same storage entry to override older ones */
		const siteScopedStorageKeysAndUpdatedValuesMap = new Map<
			WxtStorageItem<DetailedStatisticsSchema, Record<string, unknown>>["key"],
			DetailedStatisticsSchema
		>();

		for (const measurement of measurements) {
			const siteScopedStatsStorageItem = getSiteSpecificStatisticsStorageItem(
				measurement.hostOrigin,
			);

			let siteScopedStats =
				siteScopedStorageKeysAndUpdatedValuesMap.get(
					siteScopedStatsStorageItem.key,
				) ?? (await siteScopedStatsStorageItem.getValue());

			const updatedStats = applyBandwidthMeasurementsToStatistics(
				measurement,
				globalStats,
				siteScopedStats,
			);

			globalStats = updatedStats.globalStats;
			siteScopedStats = updatedStats.siteScopedStats;

			siteScopedStorageKeysAndUpdatedValuesMap.set(
				siteScopedStatsStorageItem.key,
				siteScopedStats,
			);
		}

		const storageKeysAndUpdatedValuesArray: StorageSetItemsArrayParam =
			Array.from(siteScopedStorageKeysAndUpdatedValuesMap, ([key, value]) => ({
				key,
				value,
			}));
		storageKeysAndUpdatedValuesArray.push({
			item: statisticsStorageItem,
			value: globalStats,
		});

		await storage.setItems(storageKeysAndUpdatedValuesArray);
	},
);

/** Returns the overload of keys that don't fit within the limit */
function getOverloadDailyStatsKeys(
	dailyStats: CombinedAssetStatisticsSchema["dailyStats"],
): number[] {
	const rawDays: string[] = [];

	// Since some keys may temporarily be present, but have undefined values (they'll disappear during serialization anyway)
	for (const key in dailyStats) {
		if (dailyStats[key]) rawDays.push(key);
	}

	if (rawDays.length <= MAX_DAYS_OF_DAILY_STATISTICS) return [];

	/** Ascending order is used so the oldest entries are at the beginning and can be easily sliced */
	const sortedDays: ReadonlyArray<number> = rawDays
		.map(Number)
		.sort((a, b) => a - b);

	const overloadDayCount = rawDays.length - MAX_DAYS_OF_DAILY_STATISTICS;

	return sortedDays.slice(0, overloadDayCount);
}

/** If applicable, it trims down older daily stat entries and accumulates them in the aggregate object.
 *
 * Can be rather expensive
 */
function aggregateOldDailyStats(
	combinedStats: CombinedAssetStatisticsSchema,
): CombinedAssetStatisticsSchema {
	return immer.produce(combinedStats, (draft) => {
		for (const overloadKey of getOverloadDailyStatsKeys(draft.dailyStats)) {
			const overloadStats =
				draft.dailyStats[overloadKey] ?? DEFAULT_SINGLE_ASSET_STATISTICS;

			let key: keyof typeof overloadStats;

			for (key in overloadStats) {
				draft.aggregate[key] += overloadStats[key];
			}

			// Since this will get JSON serialized later, `undefined` keys get dropped so manually `delete`-ing isn't required, and won't tank perf.
			draft.dailyStats[overloadKey] = undefined;
		}
	});
}

function aggregateOldDailyStatsInStatsObject({
	bytesSaved,
	bytesUsed,
	requestsCompressed,
	requestsMade,
	lastReset,
}: StatisticsSchema): StatisticsSchema {
	const converted: StatisticsSchema = {
		bytesSaved: aggregateOldDailyStats(bytesSaved),
		bytesUsed: aggregateOldDailyStats(bytesUsed),
		lastReset,
		requestsCompressed: aggregateOldDailyStats(requestsCompressed),
		requestsMade: aggregateOldDailyStats(requestsMade),
	};

	return converted;
}

function aggregateOldDailyStatsInDetailedStatsObject({
	bytesSaved,
	bytesUsed,
	requestsCompressed,
	requestsMade,
	lastReset,
	crossOrigin,
}: DetailedStatisticsSchema): DetailedStatisticsSchema {
	const convertedCrossOrigin: Record<UrlSchema, CombinedAssetStatisticsSchema> =
		{};

	let key: UrlSchema;
	for (key in crossOrigin) {
		const val = crossOrigin[key];

		if (!val) continue;

		convertedCrossOrigin[key] = aggregateOldDailyStats(val);
	}

	const converted: DetailedStatisticsSchema = {
		bytesSaved: aggregateOldDailyStats(bytesSaved),
		bytesUsed: aggregateOldDailyStats(bytesUsed),
		crossOrigin: convertedCrossOrigin,
		lastReset,
		requestsCompressed: aggregateOldDailyStats(requestsCompressed),
		requestsMade: aggregateOldDailyStats(requestsMade),
	};

	return converted;
}

/** I could make this run *faster* by parallelizing the promises but since it's maintainance stuff, I think I can afford to take my time and keep cpu usage + memory as low as I can */
async function oldDailyStatsAggregatorListener(alarm: Browser.alarms.Alarm) {
	if (alarm.name !== ALARM_NAME.AGGREGATE_OLD_DAILY_STATS) return;

	let globalStats = await statisticsStorageItem.getValue();

	globalStats = aggregateOldDailyStatsInStatsObject(globalStats);

	/** String keys are used over the storage item instances so it'll be easy for updated stats with the same storage entry to override older ones */
	const siteScopedStorageKeysAndUpdatedValuesMap = new Map<
		WxtStorageItem<DetailedStatisticsSchema, Record<string, unknown>>["key"],
		DetailedStatisticsSchema
	>();

	for (const siteScopedOrigin of await getSiteUrlOrigins()) {
		const siteScopedStatsStorageItem =
			getSiteSpecificStatisticsStorageItem(siteScopedOrigin);

		let siteScopedStats =
			siteScopedStorageKeysAndUpdatedValuesMap.get(
				siteScopedStatsStorageItem.key,
			) ?? (await siteScopedStatsStorageItem.getValue());

		siteScopedStats =
			aggregateOldDailyStatsInDetailedStatsObject(siteScopedStats);

		siteScopedStorageKeysAndUpdatedValuesMap.set(
			siteScopedStatsStorageItem.key,
			siteScopedStats,
		);
	}

	const storageKeysAndUpdatedValuesArray: StorageSetItemsArrayParam =
		Array.from(siteScopedStorageKeysAndUpdatedValuesMap, ([key, value]) => ({
			key,
			value,
		}));
	storageKeysAndUpdatedValuesArray.push({
		item: statisticsStorageItem,
		value: globalStats,
	});

	await storage.setItems(storageKeysAndUpdatedValuesArray);
}

const alarms = browser.alarms;

export function createDailyAlarmForAggregatingOldDailyStats() {
	alarms.create(
		ALARM_NAME.AGGREGATE_OLD_DAILY_STATS,
		// 1 day
		{ periodInMinutes: 60 * 24 },
	);

	alarms.onAlarm.removeListener(oldDailyStatsAggregatorListener);

	alarms.onAlarm.addListener(oldDailyStatsAggregatorListener);
}
