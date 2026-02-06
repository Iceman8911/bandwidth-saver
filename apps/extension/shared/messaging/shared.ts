import { MessageType } from "../constants";
import type {
	BandwidthMonitoringMessagePayload,
	SpoofSlowNetworkViaInjectedScriptPayload,
} from "../types";

export interface MessagingProtocolMap {
	[MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API](
		data: BandwidthMonitoringMessagePayload,
	): void;

	[MessageType.SPOOF_SLOW_NETWORK](
		data: SpoofSlowNetworkViaInjectedScriptPayload,
	): void;
}
