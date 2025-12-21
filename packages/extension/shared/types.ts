import type { UrlSchema } from "@bandwidth-saver/shared";
import type { SingleAssetStatisticsSchema } from "@/models/storage";

export type BandwidthMonitoringMessagePayload = {
	/** The full url for the downloaded asset which may be cross-origin */
	assetUrl: UrlSchema;

	/** The host site itself.
	 *
	 *	Must be the orgin of the url */
	hostOrigin: UrlSchema;

	/** Bytes downloaded for the asset type */
	bytes: SingleAssetStatisticsSchema;

	/** The asset type */
	type: keyof SingleAssetStatisticsSchema;
};
