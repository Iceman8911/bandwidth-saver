import { defineExtensionMessaging } from "@webext-core/messaging";
import { MessageType } from "./constants";
import type { BandwidthMonitoringMessagePayload } from "./types";

interface ProtocolMap {
	[MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API](
		data: BandwidthMonitoringMessagePayload,
	): void;

	[MessageType.MONITOR_BANDWIDTH_WITH_WEB_REQUEST](
		data: BandwidthMonitoringMessagePayload,
	): void;
}

export const { onMessage, sendMessage } =
	defineExtensionMessaging<ProtocolMap>();
