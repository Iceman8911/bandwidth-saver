import { describe, expect, test } from "bun:test";
import {
	getProxyEnv,
	ServerAPIEndpoint,
	UrlSchema,
} from "@bandwidth-saver/shared";
import * as v from "valibot";

type ImageSizeAndType = {
	size: number;
	type: string;
};

type TestImageResponse = {
	compressed: ImageSizeAndType;
	regular: ImageSizeAndType;
	url: UrlSchema;
};

const env = getProxyEnv();

const proxyBaseUrl = `http://${env.VITE_SERVER_HOST}:${env.VITE_SERVER_PORT}`;

const sampleImageUrls = [
	// Wikimedia Commons (stable direct file URLs for PNG/JPEG)
	"https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png",
	// "https://upload.wikimedia.org/wikipedia/commons/0/0a/The_Great_Wave_off_Kanagawa.jpg",
	// "https://upload.wikimedia.org/wikipedia/commons/9/9a/Gull_portrait_ca_usa.jpg",

	// NASA (direct image assets)
	"https://www.nasa.gov/wp-content/uploads/2023/03/nasa-logo-web-rgb.png",

	// GitHub raw (small deterministic PNGs)
	"https://raw.githubusercontent.com/github/explore/main/topics/javascript/javascript.png",
	"https://raw.githubusercontent.com/github/explore/main/topics/typescript/typescript.png",
	"https://raw.githubusercontent.com/github/explore/main/topics/nodejs/nodejs.png",

	"https://avatars.githubusercontent.com/u/108531451?s=40&v=4",
	"https://raw.githubusercontent.com/jesseduffield/lazygit/assets/demo/interactive_rebase-compressed.gif",

	"https://preview.redd.it/okay-im-done-with-this-for-now-mechanic-girl-returns-again-v0-pkou5s4rrcdg1.gif?width=640&crop=smart&format=png8&s=9a911e78547d99775b8d471ebdf861c73fdd15d8",
	"https://preview.redd.it/mimis-older-vs-newer-character-design-v0-9pvpps5hqgdg1.png?auto=webp&s=74e9b302f53a02b5fc389e39994f67754d2c3b35",
] as const satisfies string[];

async function fetchCompressedAndRegularImage(
	imgUrl: string,
): Promise<TestImageResponse> {
	const url = v.parse(UrlSchema, imgUrl);

	const compressedUrl = new URL(
		`${proxyBaseUrl}/${ServerAPIEndpoint.COMPRESS_IMAGE}`,
	);
	compressedUrl.searchParams.set("format_bwsvr8911", "auto");
	compressedUrl.searchParams.set("preserveAnim_bwsvr8911", "true");
	compressedUrl.searchParams.set("quality_bwsvr8911", "75");
	compressedUrl.searchParams.set("url_bwsvr8911", url);

	const [compressedResponse, regularResponse] = await Promise.all([
		fetch(compressedUrl),
		fetch(url),
	]);

	const [compressedBlob, regularBlob] = await Promise.all([
		compressedResponse.blob(),
		regularResponse.blob(),
	]);

	return {
		compressed: {
			size: compressedBlob.size,
			type:
				compressedBlob.type ||
				compressedResponse.headers.get("content-type") ||
				"",
		},
		regular: {
			size: regularBlob.size,
			type:
				regularBlob.type || regularResponse.headers.get("content-type") || "",
		},
		url,
	};
}

describe("Image Compression (requires a valid internet connection)", () => {
	test(
		"Compressed images should be valid and smaller than their sources",
		async () => {
			const promises: Promise<TestImageResponse>[] = [];

			for (const url of sampleImageUrls) {
				promises.push(fetchCompressedAndRegularImage(url));
			}

			(await Promise.all(promises)).forEach(({ compressed, regular, url }) => {
				console.log(compressed, regular, url);

				expect(compressed.type.includes("image")).toBeTrue();
				expect(compressed.size).toBeLessThanOrEqual(regular.size);
			});
		},
		{ timeout: 60000 },
	);
});
