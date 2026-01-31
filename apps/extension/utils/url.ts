import type { UrlSchema } from "@bandwidth-saver/shared";
import { lru } from "tiny-lru";
import type { SingleAssetStatisticsSchema } from "@/models/storage";
import { generateDeterministicNumericIdsFromString } from "./id";

const IMAGE_EXTS = [
	"png",
	"jpg",
	"jpeg",
	"webp",
	"gif",
	"svg",
	"ico",
	"avif",
	"jxl",
];
const STYLE_EXTS = ["css"];
const SCRIPT_EXTS = ["js", "mjs", "cjs", "wasm"];
const HTML_EXTS = ["html", "htm"];
const FONT_EXTS = ["woff", "woff2", "ttf", "otf", "eot"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "mkv"];
const AUDIO_EXTS = ["mp3", "wav", "flac", "aac", "ogg"];

export function detectAssetTypeFromUrl(
	url: URL,
): keyof SingleAssetStatisticsSchema {
	try {
		const { pathname } = url;
		const ext = pathname.split(".").pop()?.toLowerCase() ?? "";

		if (IMAGE_EXTS.includes(ext)) return "image";
		if (STYLE_EXTS.includes(ext)) return "style";
		if (SCRIPT_EXTS.includes(ext)) return "script";
		if (HTML_EXTS.includes(ext)) return "html";
		if (FONT_EXTS.includes(ext)) return "font";
		if (VIDEO_EXTS.includes(ext)) return "video";
		if (AUDIO_EXTS.includes(ext)) return "audio";

		return "other";
	} catch {
		return "other";
	}
}

const URL_SCHEMA_ORIGIN_MATCHER = /^\w:\/\/[^/]+/;

export function getUrlSchemaOrigin(url: UrlSchema): UrlSchema {
	const match = url.match(URL_SCHEMA_ORIGIN_MATCHER);

	//@ts-expect-error This will always be a valid url
	return match ? match[0] : url;
}

const URL_SCHEMA_HOST_MATCHER = /^(?:[\w-]+:\/\/)?([\w.-]+)/;

export function getUrlSchemaHost(url: string): string {
	const possibleHost = url.match(URL_SCHEMA_HOST_MATCHER)?.[1];

	if (!possibleHost) throw Error(`Could not extract host from "url": ${url}`);

	return possibleHost;
}

const URL_SCHEMA_EXTENSION_CHECKER_MATCHER = /^.*extension.*:\/\//;

export function isExtensionUrl(url: UrlSchema): boolean {
	return URL_SCHEMA_EXTENSION_CHECKER_MATCHER.test(url);
}

export type DnrSiteScopeUrlIdPayload = Readonly<{
	compression: Readonly<{
		simple: number;
		proxy: number;
	}>;
	saveData: number;
	cspBlock: number;
}>;

const urlIdCache = lru<DnrSiteScopeUrlIdPayload>(200);

export function getUrlIdsFromOrigin(
	origin: UrlSchema,
): DnrSiteScopeUrlIdPayload {
	const cachedIds = urlIdCache.get(origin);

	if (cachedIds) return cachedIds;

	const [simpleCompressionId, proxyCompressionId, saveDataId, cspBlockId] =
		generateDeterministicNumericIdsFromString(origin, 4);

	const ids: DnrSiteScopeUrlIdPayload = {
		compression: {
			proxy: proxyCompressionId,
			simple: simpleCompressionId,
		},
		cspBlock: cspBlockId,
		saveData: saveDataId,
	};

	urlIdCache.set(origin, ids);

	return ids;
}
