import { compressionModeProxyToggleWatcher } from "./compression/proxy";
import { compressionModeSimpleToggleWatcher } from "./compression/simple-mode";
import { registerStaticRules } from "./compression/static-rules";
import { cspBypassToggleWatcher } from "./csp-workaround";
import { saveDataToggleWatcher } from "./save-data";
import { processMonitoredBandwidthData } from "./statistics/bandwidth-calculation";
import { monitorBandwidthUsageViaBackground } from "./statistics/bandwidth-monitoring";

export default defineBackground(() => {
	registerStaticRules();

	monitorBandwidthUsageViaBackground();
	processMonitoredBandwidthData();

	saveDataToggleWatcher();
	compressionModeSimpleToggleWatcher();
	compressionModeProxyToggleWatcher();
	cspBypassToggleWatcher();
});
