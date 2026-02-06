interface CompressionResult {
	buffer: Uint8Array;
	mode: "gzip" | "zstd";
}

/** Uses either zstd or gzip for compression */
export async function compressTextBuffer(
	src: Uint8Array<ArrayBuffer>,
	canUseZstd: boolean,
): Promise<CompressionResult> {
	if (process.env.DEPLOYMENT_PLATFORM === "server") {
		const { zstdCompressSync, gzipSync } = await import("node:zlib");

		// Since it's a generic server, bun should be installed
		return canUseZstd
			? { buffer: zstdCompressSync(src), mode: "zstd" }
			: { buffer: gzipSync(src), mode: "gzip" };
	} else {
		if (typeof globalThis.CompressionStream === "function") {
			const compressedStream = new ReadableStream<Uint8Array<ArrayBuffer>>({
				start(controller) {
					controller.enqueue(src);
					controller.close();
				},
			}).pipeThrough<Uint8Array<ArrayBuffer>>(new CompressionStream("gzip"));

			return {
				buffer: await new Response(compressedStream).bytes(),
				mode: "gzip",
			};
		} else {
			// Rely on node since that's what stuff like vercel use
			const { zstdCompressSync, gzipSync } = await import("node:zlib");

			return canUseZstd
				? { buffer: zstdCompressSync(src), mode: "zstd" }
				: { buffer: gzipSync(src), mode: "gzip" };
		}
	}
}
