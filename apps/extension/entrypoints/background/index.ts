import { defineBackground } from "wxt/utils/define-background";
import { startRecordingPossibleSiteOriginsToEnqueue } from "@/utils/storage";
import { setupDnrRulesAndRefreshing } from "./combined-dnr-setup";
import { registerStaticRules } from "./static-rules";
import {
	createDailyAlarmForAggregatingOldDailyStats,
	startCachingBandwidthDataFromPerformanceApi,
} from "./statistics/bandwidth-calculation";
import { monitorBandwidthUsageViaBackground } from "./statistics/bandwidth-monitoring";

export default defineBackground({
	main() {
		registerStaticRules();

		startRecordingPossibleSiteOriginsToEnqueue();

		monitorBandwidthUsageViaBackground();
		startCachingBandwidthDataFromPerformanceApi();
		createDailyAlarmForAggregatingOldDailyStats();

		setupDnrRulesAndRefreshing();
	},
	type: "module",
});
