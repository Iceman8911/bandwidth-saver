import { createAsync } from "@solidjs/router";
import {
	type DEFAULT_COMBINED_ASSET_STATISTICS,
	DEFAULT_SINGLE_ASSET_STATISTICS,
	DEFAULT_STATISTICS,
} from "@/models/storage";
import { statisticsStorageItem } from "@/shared/storage";
import {
	OptionsPageBandwidthUsageBreakdownChart,
	OptionsPageBandwidthUsageOverTimeChart,
	OptionsPageBytesSavedChart,
	OptionsPageRequestsBlockedChart,
	OptionsPageRequestsCompressedChart,
	OptionsPageRequestsMadeChart,
} from "../components/statistics";
import { getDailyStatisticsForWeek } from "../shared/utils";

function getTotalBandwidthStatisticsBreakdown(
	combinedStats: typeof DEFAULT_COMBINED_ASSET_STATISTICS,
): Readonly<typeof DEFAULT_SINGLE_ASSET_STATISTICS> {
	const summedDailyStats = Object.values(combinedStats.dailyStats).reduce(
		(aggregateStats, dailyStat) => {
			let key: keyof typeof aggregateStats;

			for (key in aggregateStats) {
				aggregateStats[key] += dailyStat[key];
			}

			return aggregateStats;
		},
		DEFAULT_SINGLE_ASSET_STATISTICS,
	);

	return summedDailyStats;
}

export default function OptionsPageOverviewRoute() {
	const allStatistics = createAsync(() => statisticsStorageItem.getValue(), {
		initialValue: DEFAULT_STATISTICS,
	});

	const totalBandwidthUsedStatistics = createMemo(
		() => allStatistics.latest.bytesUsed,
	);

	const weeklyBandwidthStats = createMemo(
		() => getDailyStatisticsForWeek(totalBandwidthUsedStatistics().dailyStats),
		undefined,
		{ equals: false },
	);

	const bandwidthUsageBreakdown = createMemo(
		() => getTotalBandwidthStatisticsBreakdown(totalBandwidthUsedStatistics()),
		undefined,
		{ equals: false },
	);

	const requestsCompressed = createMemo(
		() => allStatistics.latest.requestsCompressed,
	);

	const weeklyRequestsCompressed = createMemo(
		() => getDailyStatisticsForWeek(requestsCompressed().dailyStats),
		undefined,
		{ equals: false },
	);

	const requestsMade = createMemo(() => allStatistics.latest.requestsMade);

	const weeklyRequestsMade = createMemo(
		() => getDailyStatisticsForWeek(requestsMade().dailyStats),
		undefined,
		{ equals: false },
	);

	const requestsBlocked = createMemo(
		() => allStatistics.latest.requestsBlocked,
	);

	const weeklyRequestsBlocked = createMemo(
		() => getDailyStatisticsForWeek(requestsBlocked().dailyStats),
		undefined,
		{ equals: false },
	);

	const bytesSaved = createMemo(() => allStatistics.latest.bytesSaved);

	const weeklyBytesSaved = createMemo(
		() => getDailyStatisticsForWeek(bytesSaved().dailyStats),
		undefined,
		{ equals: false },
	);

	return (
		<div class="grid h-full grid-cols-8 grid-rows-10 gap-4">
			<OptionsPageBandwidthUsageOverTimeChart
				class="col-span-full row-span-5 md:col-span-5"
				usage={weeklyBandwidthStats()}
			/>

			<OptionsPageBandwidthUsageBreakdownChart
				class="col-span-full row-span-5 md:col-span-3"
				usage={bandwidthUsageBreakdown()}
			/>

			<OptionsPageRequestsMadeChart
				class="col-span-full row-span-2 md:col-span-2"
				usage={weeklyRequestsMade()}
			/>

			<OptionsPageRequestsCompressedChart
				class="col-span-full row-span-2 md:col-span-2"
				usage={weeklyRequestsCompressed()}
			/>

			<OptionsPageRequestsBlockedChart
				class="col-span-full row-span-2 md:col-span-2"
				usage={weeklyRequestsBlocked()}
			/>

			<OptionsPageBytesSavedChart
				class="col-span-full row-span-2 md:col-span-2"
				usage={weeklyBytesSaved()}
			/>
		</div>
	);
}
