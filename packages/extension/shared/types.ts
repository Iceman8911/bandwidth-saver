import type { UrlSchema } from "@bandwidth-saver/shared";
import type { AssetStatisticsSchema } from "@/models/storage";

export type BandwidthMonitoringMessagePayload = {
	/** The full url for the downloaded asset which may be cross-origin */
	assetUrl: UrlSchema;

	/** The host site itself.
	 *
	 *	Must be the orgin of the url */
	hostOrigin: UrlSchema;

	/** Bytes downloaded for the asset type */
	bytes: AssetStatisticsSchema;

	/** The asset type */
	type: keyof AssetStatisticsSchema;
};
