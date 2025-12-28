import type { DEFAULT_COMBINED_ASSET_STATISTICS } from "@/models/storage";
import type { OptionsPageUsageOverTimeProps } from "../components/statistics";

export function getDailyStatisticsForWeek(
	dailyStats: Readonly<typeof DEFAULT_COMBINED_ASSET_STATISTICS.dailyStats>,
): OptionsPageUsageOverTimeProps["usage"] {
	const dailyStatsAsArray = Object.entries(dailyStats);

	const dailyStatsWithAggregatedValues = dailyStatsAsArray
		.map(([dateNumberString, stats]) => ({
			date: new Date(Number(dateNumberString)),
			used: getSumOfValuesInObject(stats),
		}))
		// In descending order so the most recent entries are at the beginning of the array
		.sort(({ date: a }, { date: b }) => Number(b) - Number(a))
		// Get at most 8 days (yeah, I know it's not exactly a week :p)
		.slice(0, 8)
		// Reverse the order for the chart so the most recent entries will be rightmost
		.reverse();

	return dailyStatsWithAggregatedValues;
}
