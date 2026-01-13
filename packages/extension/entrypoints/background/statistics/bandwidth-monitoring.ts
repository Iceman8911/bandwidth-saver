import type { SingleAssetStatisticsSchema } from "@/models/storage";
import { DUMMY_TAB_URL } from "@/shared/constants";
import { detectAssetTypeFromUrl } from "@/utils/url";
import { cacheBandwidthDataFromWebRequest } from "./bandwidth-calculation";

function detectAssetTypeFromContentTypeOrUrl(
	url: string | URL,
	contentType?: string,
): keyof SingleAssetStatisticsSchema {
	const parsedUrl = url instanceof URL ? url : new URL(url);

	if (!contentType) return detectAssetTypeFromUrl(parsedUrl);

	if (contentType.startsWith("image/")) return "image";
	if (contentType.includes("css")) return "style";
	if (
		contentType.includes("javascript") ||
		contentType.includes("application/ecmascript") ||
		contentType === "application/wasm"
	)
		return "script";
	if (contentType.includes("html") || contentType.includes("text/html"))
		return "html";
	if (contentType.startsWith("video/")) return "video";
	if (contentType.startsWith("audio/")) return "audio";
	if (
		contentType.startsWith("font/") ||
		contentType.includes("woff") ||
		contentType.includes("truetype")
	)
		return "font";

	return detectAssetTypeFromUrl(parsedUrl);
}

export function monitorBandwidthUsageViaBackground() {
	browser.webRequest.onCompleted.addListener(
		({ responseHeaders = [], type, url, fromCache, initiator }) => {
			// No need to bother ourselves if the asset is cached
			if (fromCache) return;

			const parsedUrl = new URL(url);

			let contentLength = 0;
			let contentType = "other";

			for (const header of responseHeaders) {
				const headerName = header.name.toLowerCase();
				const headerValue = header.value;

				if (headerName === "content-length") {
					contentLength = Number(headerValue);
				} else if (headerName === "content-type") {
					contentType = (headerValue ?? contentType).toLowerCase();
				}
			}

			let assetType: keyof SingleAssetStatisticsSchema = "other";

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
				default:
					assetType = detectAssetTypeFromContentTypeOrUrl(
						parsedUrl,
						contentType,
					);
					break;
			}

			cacheBandwidthDataFromWebRequest({
				//@ts-expect-error a stringified URL object will always be a valid url
				assetUrl: `${parsedUrl}`,
				bytes: contentLength,
				hostOrigin: getUrlSchemaOrigin(
					//@ts-expect-error the initiator will always be a valid url
					initiator ?? DUMMY_TAB_URL,
				),
				type: assetType,
			});

			return undefined;
		},
		{ urls: ["<all_urls>"] },
		["responseHeaders"],
	);
}
