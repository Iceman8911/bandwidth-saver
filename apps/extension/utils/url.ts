import { URL_EXTENSION_REGEX, type UrlOutput } from "@bandwidth-saver/shared";
import { lru } from "tiny-lru";
import type { SingleAssetStatisticsOutput } from "@/models/storage";
import { DUMMY_TAB_URL } from "@/shared/constants";
import { generateDeterministicNumericIdsFromString } from "./id";

export function detectAssetTypeFromUrl(
	url: UrlOutput,
): keyof SingleAssetStatisticsOutput {
	const ext = url.match(URL_EXTENSION_REGEX)?.[0];

	if (!ext) return "other";

	switch (ext) {
		case "png":
		case "jpg":
		case "jpeg":
		case "webp":
		case "gif":
		case "svg":
		case "ico":
		case "avif":
		case "jxl":
			return "image";

		case "css":
			return "style";

		case "js":
		case "mjs":
		case "cjs":
		case "wasm":
			return "script";

		case "html":
		case "htm":
			return "html";

		case "woff":
		case "woff2":
		case "ttf":
		case "otf":
		case "eot":
			return "font";

		case "mp4":
		case "webm":
		case "mov":
		case "mkv":
			return "video";

		case "mp3":
		case "wav":
		case "flac":
		case "aac":
		case "ogg":
			return "audio";

		default:
			return "other";
	}
}

const URL_SCHEMA_ORIGIN_MATCHER = /^\w+:\/\/[^/]+/;

export function getUrlSchemaOrigin(url: UrlOutput): UrlOutput {
	const match = url.match(URL_SCHEMA_ORIGIN_MATCHER);

	//@ts-expect-error This will always be a valid url
	return match ? match[0] : DUMMY_TAB_URL;
}

const URL_SCHEMA_HOST_MATCHER = /^(?:[\w-]+:\/\/)?([\w.-]+)/;

export function getUrlSchemaHost(url: string): string {
	const possibleHost = url.match(URL_SCHEMA_HOST_MATCHER)?.[1];

	if (!possibleHost) throw Error(`Could not extract host from "url": ${url}`);

	return possibleHost;
}

const URL_SCHEMA_EXTENSION_CHECKER_MATCHER = /^.*extension.*:\/\//;

export function isExtensionUrl(url: UrlOutput): boolean {
	return URL_SCHEMA_EXTENSION_CHECKER_MATCHER.test(url);
}

export type DnrSiteScopeUrlIdPayload = Readonly<{
	compression: number;
	cookieSync: number;
	saveData: number;
	cspBlock: number;
	assetTypeBlock: number;
	assetExtBlock: number;
	cacheHtmlBetter: number;
}>;

const urlIdCache = lru<DnrSiteScopeUrlIdPayload>(200);

export function getUrlIdsFromOrigin(
	origin: UrlOutput,
): DnrSiteScopeUrlIdPayload {
	const cachedIds = urlIdCache.get(origin);

	if (cachedIds) return cachedIds;

	const [
		compressionId,
		saveDataId,
		cspBlockId,
		assetTypeBlockId,
		assetExtBlockId,
		cacheHtmlBetterId,
		cookieSyncId,
	] = generateDeterministicNumericIdsFromString(origin, 7);

	const ids: DnrSiteScopeUrlIdPayload = {
		assetExtBlock: assetExtBlockId,
		assetTypeBlock: assetTypeBlockId,
		cacheHtmlBetter: cacheHtmlBetterId,
		compression: compressionId,
		cookieSync: cookieSyncId,
		cspBlock: cspBlockId,
		saveData: saveDataId,
	};

	urlIdCache.set(origin, ids);

	return ids;
}
