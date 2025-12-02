import { compressionModeSimpleToggleWatcher } from "./compression/simple-mode";
import { saveDataToggleWatcher } from "./save-data";
import { processMonitoredBandwidthData } from "./statistics/bandwidth-calculation";
import { monitorBandwidthUsageViaBackground } from "./statistics/bandwidth-monitoring";

export default defineBackground(() => {
	monitorBandwidthUsageViaBackground();
	processMonitoredBandwidthData();

	saveDataToggleWatcher();
	compressionModeSimpleToggleWatcher();
});
