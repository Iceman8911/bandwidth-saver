import { defineBackground } from "wxt/utils/define-background";
import { startRecordingPossibleSiteOriginsToEnqueue } from "@/utils/storage";
import { compressionToggleWatcher } from "./compression";
import { registerStaticRules } from "./compression/static-rules";
import { cspBypassToggleWatcher } from "./csp-workaround";
import { saveDataToggleWatcher } from "./save-data";
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

		saveDataToggleWatcher();
		compressionToggleWatcher();
		cspBypassToggleWatcher();
	},
	type: "module",
});
