import type { UrlSchema } from "@bandwidth-saver/shared";
import type { AssetStatisticsSchema } from "@/models/storage";

export type BandwidthMonitoringMessagePayload = {
	/** The url for the downloaded asset */
	url: UrlSchema;
	/** Bytes downloaded for the asset type */
	bytes: AssetStatisticsSchema;
	/** The asset type */
	type: keyof AssetStatisticsSchema;
};
