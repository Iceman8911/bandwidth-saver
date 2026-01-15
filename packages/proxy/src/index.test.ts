import { describe, expect, test } from "bun:test";
import { getProxyEnv, UrlSchema } from "@bandwidth-saver/shared";
import { edenTreaty } from "@elysiajs/eden";
import * as v from "valibot";
import type { ElysiaApp } from ".";

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

const app = edenTreaty<ElysiaApp>(
	`http://${env.VITE_SERVER_HOST}:${env.VITE_SERVER_PORT}`,
);

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

	"https://preview.redd.it/okay-im-done-with-this-for-now-mechanic-girl-returns-again-v0-pkou5s4rrcdg1.gif?width=640&crop=smart&format=png8&s=9a911e78547d99775b8d471ebdf861c73fdd15d8",
] as const satisfies string[];

async function fetchCompressedAndRegularImage(
	imgUrl: string,
): Promise<TestImageResponse> {
	const url = v.parse(UrlSchema, imgUrl);

	const [compressBlob, regularBlob] = await Promise.all([
		app["compress-image"]
			.get({
				$query: {
					format_bwsvr8911: "auto",
					preserveAnim_bwsvr8911: true,
					quality_bwsvr8911: 75,
					url_bwsvr8911: url,
				},
			})
			.then(async ({ data, headers }) => {
				const parsedHeaders = new Headers(headers);

				const contentType = parsedHeaders.get("content-type") ?? "image/png";

				const blob: Blob = !data
					? await fetch(url).then((res) => res.blob())
					: data instanceof Response
						? await data.blob()
						: // Bun hasn't implemented the `type` prop yet :p
							new Blob([data], { type: contentType });

				// console.log(blob)

				return { size: blob.size, type: blob.type || contentType };
			}),
		fetch(url).then((res) => res.blob()),
	]);

	return {
		compressed: { size: compressBlob.size, type: compressBlob.type },
		regular: { size: regularBlob.size, type: regularBlob.type },
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
