import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import type { AssetStatisticsSchema } from "@/models/storage";

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

export function detectAssetTypeFromUrl(url: URL): keyof AssetStatisticsSchema {
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

export function getUrlSchemaOrigin(url: UrlSchema): UrlSchema {
	return v.parse(UrlSchema, new URL(url).origin);
}

const PROTOCOL_REGEX = /^.*\/\//;

/** So something like `https://api.datamuse.com` and `api.datamuse.com` both result in `api.datamuse.com` */
export function getHostnameForDeclarativeNetRequest(url: string): string {
	return url.replace(PROTOCOL_REGEX, "");
}
