import { defineBackground } from "wxt/utils/define-background";
import {
	getDnrRuleModifierCallbackPayload,
	runDnrRuleModifiersOnStorageChange,
} from "@/utils/dnr-rules";
import { startRecordingPossibleSiteOriginsToEnqueue } from "@/utils/storage";
import { refreshProxyCompressionDnrRules } from "./compression/proxy-mode";
import { refreshSimpleCompressionDnrRules } from "./compression/simple-mode";
import { refreshCspBlockingDnrRules } from "./csp-workaround";
import { refreshSaveDataDnrRules } from "./save-data";
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

		getDnrRuleModifierCallbackPayload().then(async (payload) => {
			// Set the rules on startup
			await Promise.all([
				refreshSaveDataDnrRules(payload),
				refreshCspBlockingDnrRules(payload),
				refreshSimpleCompressionDnrRules(payload),
				refreshProxyCompressionDnrRules(payload),
			]);

			// Refresh the rules anythime the storage changes
			runDnrRuleModifiersOnStorageChange(
				refreshSaveDataDnrRules,
				refreshCspBlockingDnrRules,
				refreshSimpleCompressionDnrRules,
				refreshProxyCompressionDnrRules,
			);
		});
	},
	type: "module",
});
