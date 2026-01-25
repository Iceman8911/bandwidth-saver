import { startRecordingPossibleSiteOriginsToEnqueue } from "@/utils/storage";
import { compressionToggleWatcher } from "./compression";
import { registerStaticRules } from "./compression/static-rules";
import { cspBypassToggleWatcher } from "./csp-workaround";
import { saveDataToggleWatcher } from "./save-data";
import { cacheBandwidthDataFromPerformanceApi } from "./statistics/bandwidth-calculation";
import { monitorBandwidthUsageViaBackground } from "./statistics/bandwidth-monitoring";

export default defineBackground(() => {
	registerStaticRules();

	startRecordingPossibleSiteOriginsToEnqueue();

	monitorBandwidthUsageViaBackground();
	cacheBandwidthDataFromPerformanceApi();

	saveDataToggleWatcher();
	compressionToggleWatcher();
	cspBypassToggleWatcher();
});
