import { MessageType } from "./shared/constants";
import { UrlSchema } from "@bandwidth-saver/shared";
import { AssetStatisticsSchema } from "./models/storage";

type BandwidthMonitoringPayload = {
	/** The url for the downloaded asset */
	url: UrlSchema;
	/** Bytes downloaded for the asset type */
	bytes: AssetStatisticsSchema;
	/** The asset type */
	type: keyof AssetStatisticsSchema;
};

declare module "webext-bridge" {
	export interface ProtocolMap {
		// foo: { title: string };
		// // to specify the return type of the message,
		// // use the `ProtocolWithReturn` type wrapper
		// bar: ProtocolWithReturn<CustomDataType, CustomReturnType>;

		[MessageType.MONITOR_BANDWIDTH_WITH_PERFORMANCE_API]: BandwidthMonitoringPayload;

		[MessageType.MONITOR_BANDWIDTH_WITH_WEB_REQUEST]: BandwidthMonitoringPayload;
	}
}
