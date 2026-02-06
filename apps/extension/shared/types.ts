import type { UrlSchema } from "@bandwidth-saver/shared";
import type {
	GeneralSettingsSchema,
	SingleAssetStatisticsSchema,
} from "@/models/storage";

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

	/** Unless the user is using the proxy mode, this will most-likely be zero. This is because I manually send a header with the bytes saved  */
	bytesSaved: number;
};

export type SpoofSlowNetworkViaInjectedScriptPayload =
	| {
			target: "content";
			/** WHat mode the content script should message to the injected script */
			mode: GeneralSettingsSchema["spoofSlowNetwork"];
	  }
	| {
			target: "background";
			/** The url origin of the content script in question */
			origin: UrlSchema;
	  };

/** Just a base layout for any compoennt that maybe be able to receive external classes */
export interface ComponentAcceptingClassesProps {
	class?: string | undefined;
}
