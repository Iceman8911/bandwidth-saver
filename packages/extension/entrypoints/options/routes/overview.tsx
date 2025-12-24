import { DEFAULT_COMBINED_ASSET_STATISTICS, DEFAULT_SINGLE_ASSET_STATISTICS } from "@/models/storage";
import { OptionsPageBandwidthUsageBreakdown, OptionsPageBandwidthUsageOverTime, OptionsPageBandwidthUsageOverTimeProps } from "../components/bandwidth-usage";
import { createAsync } from "@solidjs/router";
import { statisticsStorageItem } from "@/shared/storage";

function getDailyBandwidthStatisticsForMonth(dailyStats: Readonly<typeof DEFAULT_COMBINED_ASSET_STATISTICS.dailyStats>):OptionsPageBandwidthUsageOverTimeProps["usage"]{
  const dailyStatsAsArray = Object.entries(dailyStats)

  const dailyStatsWithAggregatedValues = dailyStatsAsArray.map(([dateNumberString, stats]) => ({ date: new Date(Number(dateNumberString)), dataUsed: getSumOfValuesInObject(stats) }))
    // In descending order so the most recent entries are at the beginning of the array
    .sort(({date:a},{date:b})=>Number(b)-Number(a))
    // Get at most 31 days for the month
    .slice(0, 31)
    // Reverse the order for the chart so the most recent entries will be rightmost
    .reverse()

  return dailyStatsWithAggregatedValues
}

export default function OptionsPageOverviewRoute() {
  const dailyBandwidthStats = createAsync(()=>statisticsStorageItem.getValue().then(stats=>getDailyBandwidthStatisticsForMonth(stats.bytesUsed.dailyStats)), {initialValue:[]} )

	return <div class="grid grid-cols-8 grid-rows-5 gap-4 max-h-full">
<OptionsPageBandwidthUsageOverTime usage={dailyBandwidthStats.latest} class="col-span-5 row-span-2"/>

<OptionsPageBandwidthUsageBreakdown usage={DEFAULT_SINGLE_ASSET_STATISTICS} class="col-span-3 row-span-2"/>

	</div>
}
