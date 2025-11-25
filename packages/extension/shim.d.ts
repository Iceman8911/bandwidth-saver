import "webext-bridge";
import { MessageType } from "./shared/constants";
import { BandwidthMonitoringMessagePayload } from "./shared/types";

declare module "webext-bridge" {
	export interface ProtocolMap {
		// foo: { title: string };
		// // to specify the return type of the message,
		// // use the `ProtocolWithReturn` type wrapper
		// bar: ProtocolWithReturn<CustomDataType, CustomReturnType>;

		[MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API]: BandwidthMonitoringMessagePayload;

		[MessageType.MONITOR_BANDWIDTH_WITH_WEB_REQUEST]: BandwidthMonitoringMessagePayload;
	}
}
