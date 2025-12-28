import { createAsync } from "@solidjs/router";
import { createMemo } from "solid-js";
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
} from "../components/statistic-charts";
import { OptionsPageStatisticSummaryTable } from "../components/statistic-table";
import { getDailyStatisticsForWeek } from "../shared/utils";

/**
 * Sum combined daily stats into a single asset statistics object.
 */
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
		<div class="flex h-full flex-col gap-4 overflow-y-auto md:grid md:grid-cols-8 md:grid-rows-9 md:gap-4">
			<OptionsPageBandwidthUsageOverTimeChart
				class="h-72 w-full flex-none md:col-span-5 md:row-span-5 md:h-auto"
				usage={weeklyBandwidthStats()}
			/>

			<OptionsPageBandwidthUsageBreakdownChart
				class="h-72 w-full flex-none md:col-span-3 md:row-span-5 md:h-auto"
				usage={bandwidthUsageBreakdown()}
			/>

			<OptionsPageRequestsMadeChart
				class="h-40 w-full flex-none md:col-span-2 md:row-span-2 md:h-auto"
				usage={weeklyRequestsMade()}
			/>

			<OptionsPageRequestsCompressedChart
				class="h-40 w-full flex-none md:col-span-2 md:row-span-2 md:row-start-8 md:h-auto"
				usage={weeklyRequestsCompressed()}
			/>

			<OptionsPageRequestsBlockedChart
				class="h-40 w-full flex-none md:col-span-2 md:row-span-2 md:h-auto"
				usage={weeklyRequestsBlocked()}
			/>

			<OptionsPageBytesSavedChart
				class="h-40 w-full flex-none md:col-span-2 md:row-span-2 md:row-start-8 md:h-auto"
				usage={weeklyBytesSaved()}
			/>

			<OptionsPageStatisticSummaryTable class="h-76 w-full flex-none md:col-span-4 md:row-span-4 md:h-auto" />
		</div>
	);
}
