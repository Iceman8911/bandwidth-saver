import {
	BatchQueue,
	ProxyCustomHeaders,
	type UrlOutput,
} from "@bandwidth-saver/shared";
import { type Browser, browser } from "wxt/browser";
import type { SingleAssetStatisticsOutput } from "@/models/storage";
import { DUMMY_TAB_URL } from "@/shared/constants";
import { detectAssetTypeFromUrl, getUrlSchemaOrigin } from "@/utils/url";
import { cacheBandwidthDataFromWebRequest } from "./bandwidth-calculation";

type RelevantPropsFromOnCompletedEventPayload = {
	responseHeaders: Browser.webRequest.HttpHeader[];
	type: Browser.webRequest.OnCompletedDetails["type"];
	url: UrlOutput;
	fromCache: boolean;
	initiator: UrlOutput;
};

const pendingWebRequestPayloadBatchQueue =
	new BatchQueue<RelevantPropsFromOnCompletedEventPayload>({
		batchSize: 25,
		intervalMs: 750,
	});

function detectAssetTypeFromContentTypeOrUrl(
	url: UrlOutput,
	contentType?: string,
): keyof SingleAssetStatisticsOutput {
	if (!contentType) return detectAssetTypeFromUrl(url);

	if (contentType.startsWith("image/")) return "image";
	if (contentType.startsWith("video/")) return "video";
	if (contentType.startsWith("audio/")) return "audio";
	if (contentType.includes("css")) return "style";
	if (contentType.includes("html") || contentType.includes("text/html"))
		return "html";
	if (
		contentType.includes("javascript") ||
		contentType.includes("application/ecmascript") ||
		contentType === "application/wasm"
	)
		return "script";
	if (
		contentType.startsWith("font/") ||
		contentType.includes("woff") ||
		contentType.includes("truetype")
	)
		return "font";

	return detectAssetTypeFromUrl(url);
}

function parsedNumber(numberish: unknown): number {
	const parsed = Number(numberish);

	return Number.isFinite(parsed) ? parsed : 0;
}

function webRequestOnCompletedListener({
	fromCache,
	initiator,
	responseHeaders,
	type,
	url: assetUrl,
}: RelevantPropsFromOnCompletedEventPayload) {
	// No need to bother ourselves if the asset is cached
	if (fromCache) return;

	// Don't count injected scripts
	if (assetUrl.includes("extension://")) return;

	let contentLength = 0;
	let contentType = "other";
	let bytesSaved = 0;

	for (const header of responseHeaders) {
		const headerName = header.name.toLowerCase();
		const headerValue = header.value;

		switch (headerName) {
			case "content-length":
				contentLength = parsedNumber(headerValue);
				break;
			case "content-type":
				if (headerValue) contentType = headerValue.toLowerCase();
				break;
			case ProxyCustomHeaders.BYTES_SAVED:
				bytesSaved = parsedNumber(headerValue);
				break;
		}
	}

	let assetType: keyof SingleAssetStatisticsOutput = "other";

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
			assetType = detectAssetTypeFromContentTypeOrUrl(assetUrl, contentType);
			break;
	}

	cacheBandwidthDataFromWebRequest({
		assetUrl,
		bytes: contentLength,
		bytesSaved,
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
