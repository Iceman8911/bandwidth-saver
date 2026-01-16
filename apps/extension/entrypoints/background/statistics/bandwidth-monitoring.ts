import { BatchQueue, type UrlSchema } from "@bandwidth-saver/shared";
import type { SingleAssetStatisticsSchema } from "@/models/storage";
import { DUMMY_TAB_URL } from "@/shared/constants";
import { detectAssetTypeFromUrl } from "@/utils/url";
import { cacheBandwidthDataFromWebRequest } from "./bandwidth-calculation";

type RelevantPropsFromOnCompletedEventPayload = {
	responseHeaders: Browser.webRequest.HttpHeader[];
	type: Browser.webRequest.OnCompletedDetails["type"];
	url: UrlSchema;
	fromCache: boolean;
	initiator: UrlSchema;
};

const pendingWebRequestPayloadBatchQueue =
	new BatchQueue<RelevantPropsFromOnCompletedEventPayload>({
		batchSize: 25,
		intervalMs: 750,
	});

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

function webRequestOnCompletedListener({
	fromCache,
	initiator,
	responseHeaders,
	type,
	url,
}: RelevantPropsFromOnCompletedEventPayload) {
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
			assetType = detectAssetTypeFromContentTypeOrUrl(parsedUrl, contentType);
			break;
	}

	cacheBandwidthDataFromWebRequest({
		//@ts-expect-error a stringified URL object will always be a valid url
		assetUrl: `${parsedUrl}`,
		bytes: contentLength,
		hostOrigin: getUrlSchemaOrigin(initiator),
		type: assetType,
	});

	return undefined;
}

pendingWebRequestPayloadBatchQueue.addCallbacks((payloads) => {
	for (const payload of payloads) {
		webRequestOnCompletedListener(payload);
	}
});

export function monitorBandwidthUsageViaBackground() {
	browser.webRequest.onCompleted.addListener(
		({
			fromCache,
			initiator = DUMMY_TAB_URL,
			responseHeaders = [],
			type,
			url,
		}) => {
			pendingWebRequestPayloadBatchQueue.enqueue({
				fromCache,

				//@ts-expect-error the initiator will always be a valid url
				initiator,
				responseHeaders,
				type,

				//@ts-expect-error the initiator will always be a valid url
				url,
			});
		},
		{ urls: ["<all_urls>"] },
		["responseHeaders"],
	);
}
