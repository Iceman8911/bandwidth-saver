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
	bytes: number;

	/** The asset type */
	type: keyof SingleAssetStatisticsSchema;
};

/** Just a base layout for any compoennt that maybe be able to receive external classes */
export interface ComponentAcceptingClassesProps {
	class?: string | undefined;
}
