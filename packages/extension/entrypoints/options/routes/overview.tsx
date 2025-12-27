import { createAsync } from "@solidjs/router";
import {
	type DEFAULT_COMBINED_ASSET_STATISTICS,
	DEFAULT_SINGLE_ASSET_STATISTICS,
	DEFAULT_STATISTICS,
} from "@/models/storage";
import { statisticsStorageItem } from "@/shared/storage";
import {
	OptionsPageBandwidthUsageBreakdown,
	OptionsPageBandwidthUsageOverTime,
	type OptionsPageBandwidthUsageOverTimeProps,
} from "../components/bandwidth-usage";

function getDailyBandwidthStatisticsForWeek(
	dailyStats: Readonly<typeof DEFAULT_COMBINED_ASSET_STATISTICS.dailyStats>,
): OptionsPageBandwidthUsageOverTimeProps["usage"] {
	const dailyStatsAsArray = Object.entries(dailyStats);

	const dailyStatsWithAggregatedValues = dailyStatsAsArray
		.map(([dateNumberString, stats]) => ({
			dataUsed: getSumOfValuesInObject(stats),
			date: new Date(Number(dateNumberString)),
		}))
		// In descending order so the most recent entries are at the beginning of the array
		.sort(({ date: a }, { date: b }) => Number(b) - Number(a))
		// Get at most 8 days (yeah, I know it's not exactly a week :p)
		.slice(0, 8)
		// Reverse the order for the chart so the most recent entries will be rightmost
		.reverse();

	return dailyStatsWithAggregatedValues;
}

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
		() =>
			getDailyBandwidthStatisticsForWeek(
				totalBandwidthUsedStatistics().dailyStats,
			),
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
			<OptionsPageBandwidthUsageOverTime
				class="col-span-full row-span-5 md:col-span-5"
				usage={dailyBandwidthStats()}
			/>

			<OptionsPageBandwidthUsageBreakdown
				class="col-span-full row-span-5 md:col-span-3"
				usage={bandwidthUsageBreakdown()}
			/>
		</div>
	);
}
