import * as v from "valibot";

const IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	// "image/svg+xml",
	"image/bmp",
	"image/tiff",
	"image/x-icon",
	"image/avif",
	"image/apng",
] as const;

const ImageMimeType = v.picklist(IMAGE_MIME_TYPES);
export type ImageMimeType = v.InferOutput<typeof ImageMimeType>;

export async function checkIfUrlReturnsValidResponse(
	url: string,
	responseTypesToMatch?: ReadonlyArray<string>,
): Promise<{ success: true; url: string } | { success: false }> {
	try {
		const response = await fetch(url, { method: "HEAD" });

		const contentTypeSet = new Set(
			(response.headers.get("content-type") ?? "")
				.split(";")
				.map((str) => str.trim()),
		);
		const responseTypesToMatchSet = new Set(responseTypesToMatch ?? []);

		if (
			response.ok &&
			(responseTypesToMatch
				? responseTypesToMatchSet.intersection(contentTypeSet).size
				: true)
		) {
			return { success: true, url };
		}
		return { success: false };
	} catch {
		return { success: false };
	}
}

export async function checkIfUrlReturnsValidImage(url: string) {
	return checkIfUrlReturnsValidResponse(url, IMAGE_MIME_TYPES);
}

export function getLikelyImageUrlMimeType(
	imgUrl: string,
	srcMimeType?: string | undefined | null,
): ImageMimeType | null {
	if (srcMimeType) {
		const { output, success } = v.safeParse(ImageMimeType, srcMimeType);

		if (success) return output;
	}

	// Fall back to extension sniffing
	const possibleExt = imgUrl.split(".").at(-1);

	switch (possibleExt) {
		case "png":
			return "image/png";
		case "jpeg":
		case "jpg":
		case "jfif":
		case "pjpeg":
		case "pj":
			return "image/jpeg";
		case "webp":
			return "image/webp";
		case "avif":
			return "image/avif";
		case "gif":
			return "image/gif";
		case "bmp":
			return "image/bmp";
		case "tif":
		case "tiff":
			return "image/tiff";
		case "apng":
			return "image/apng";

		default:
			return null;
	}
}

export function getFetchTimeoutSignal(timeoutInMs = 2500): AbortSignal {
	return AbortSignal.timeout(timeoutInMs);
}
