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
				? contentTypeSet != null &&
					responseTypesToMatchSet.intersection(contentTypeSet).size
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
