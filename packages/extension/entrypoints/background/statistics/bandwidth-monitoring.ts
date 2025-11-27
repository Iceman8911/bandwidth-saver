import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import {
	type AssetStatisticsSchema,
	DEFAULT_ASSET_STATISTICS,
} from "@/models/storage";
import { DUMMY_TAB_URL } from "@/shared/constants";
import { detectAssetTypeFromUrl } from "@/shared/url";
import { cacheBandwidthDataFromWebRequest } from "./bandwidth-calculation";

const getHeader = (
	responseHeaders: Browser.webRequest.HttpHeader[],
	name: string,
) =>
	responseHeaders.find((h) => h.name.toLowerCase() === name.toLowerCase())
		?.value;

function detectAssetTypeFromContentTypeOrUrl(
	contentType?: string,
	url?: string | URL,
): keyof AssetStatisticsSchema {
	const parsedUrl = new URL(url ?? DUMMY_TAB_URL);

	if (!contentType) return detectAssetTypeFromUrl(parsedUrl);

	if (contentType.startsWith("image/")) return "image";
	if (contentType.includes("css")) return "style";
	if (
		contentType.includes("javascript") ||
		contentType.includes("application/ecmascript") ||
		contentType === "application/wasm"
	)
		return "script";
	if (contentType.startsWith("video/")) return "video";
	if (contentType.startsWith("audio/")) return "audio";
	if (
		contentType.startsWith("font/") ||
		contentType.includes("woff") ||
		contentType.includes("truetype")
	)
		return "font";
	if (contentType.includes("html") || contentType.includes("text/html"))
		return "html";

	return detectAssetTypeFromUrl(parsedUrl);
}

export function monitorBandwidthUsageViaBackground() {
	browser.webRequest.onCompleted.addListener(
		({ responseHeaders = [], type, url, fromCache, initiator }) => {
			// No need to bother ourselves if the asset is cached
			if (fromCache) return;

			const parsedUrl = new URL(url);

			const contentLength = Number(
				getHeader(responseHeaders, "content-length") ?? 0,
			);
			const contentType = (
				getHeader(responseHeaders, "content-type") ?? "other"
			).toLowerCase();

			let assetType: keyof AssetStatisticsSchema = "other";

			switch (type) {
				case "stylesheet":
					assetType = "style";
					break;
				case "script":
					assetType = "script";
					break;
				case "image":
					assetType = "image";
					break;
				case "font":
					assetType = "font";
					break;

				case "media":
					assetType = detectAssetTypeFromContentTypeOrUrl(
						contentType,
						parsedUrl,
					);
					break;
				default:
					assetType = detectAssetTypeFromContentTypeOrUrl(
						contentType,
						parsedUrl,
					);
					break;
			}

			const assetSize = { ...DEFAULT_ASSET_STATISTICS };
			assetSize[assetType] = contentLength;

			cacheBandwidthDataFromWebRequest({
				assetUrl: v.parse(UrlSchema, `${parsedUrl}`),
				bytes: assetSize,
				hostOrigin: getUrlSchemaOrigin(
					// This fallback should never really happen
					v.parse(UrlSchema, initiator ?? DUMMY_TAB_URL),
				),
				type: assetType,
			});

			return undefined;
		},
		{ urls: ["<all_urls>"] },
		["responseHeaders", "extraHeaders"],
	);
}
