import { defineBackground } from "wxt/utils/define-background";
import { startRecordingPossibleSiteOriginsToEnqueue } from "@/utils/storage";
import { setupDnrRulesAndRefreshing } from "./dnr-rules/combined-dnr-setup";
import { registerStaticRules } from "./dnr-rules/static-rules";
import { trackAndMessageSpoofSlowNetworkChangesViaContentScript } from "./spoof-slow-network";
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

		trackAndMessageSpoofSlowNetworkChangesViaContentScript();
	},
	type: "module",
});
