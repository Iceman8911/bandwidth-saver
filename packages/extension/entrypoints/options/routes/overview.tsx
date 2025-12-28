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
} from "../components/bandwidth-usage";
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

	const dailyBandwidthStats = createMemo(
		() => getDailyStatisticsForWeek(totalBandwidthUsedStatistics().dailyStats),
		undefined,
		{ equals: false },
	);

	const bandwidthUsageBreakdown = createMemo(
		() => getTotalBandwidthStatisticsBreakdown(totalBandwidthUsedStatistics()),
		undefined,
		{ equals: false },
	);

	// const

	return (
		<div class="grid h-full grid-cols-8 grid-rows-10 gap-4">
			<OptionsPageBandwidthUsageOverTimeChart
				class="col-span-full row-span-5 md:col-span-5"
				usage={dailyBandwidthStats()}
			/>

			<OptionsPageBandwidthUsageBreakdownChart
				class="col-span-full row-span-5 md:col-span-3"
				usage={bandwidthUsageBreakdown()}
			/>
		</div>
	);
}
