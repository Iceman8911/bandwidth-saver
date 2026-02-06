interface CompressionPayload {
	src: Uint8Array<ArrayBuffer>;
	mayUseZstd: boolean;
}

interface CompressionResult {
	buffer: Uint8Array;
	mode: "gzip" | "zstd";
}

async function compressWithNode({
	mayUseZstd,
	src,
}: CompressionPayload): Promise<CompressionResult> {
	const { zstdCompressSync, gzipSync } = await import("node:zlib");
	try {
		return mayUseZstd
			? { buffer: zstdCompressSync(src), mode: "zstd" }
			: { buffer: gzipSync(src, { level: 7 }), mode: "gzip" };
	} catch {
		// zstd wasn't supported
		return { buffer: gzipSync(src, { level: 7 }), mode: "gzip" };
	}
}

async function compressWithBun({
	mayUseZstd,
	src,
}: CompressionPayload): Promise<CompressionResult> {
	const { zstdCompressSync, gzipSync } = await import("bun");

	return mayUseZstd
		? { buffer: zstdCompressSync(src, { level: 10 }), mode: "zstd" }
		: { buffer: gzipSync(src, { level: 7 }), mode: "gzip" };
}

async function compressWithCompressionStream({
	mayUseZstd,
	src,
}: CompressionPayload): Promise<CompressionResult> {
	let compressionStreamer: CompressionStream;
	let mode: "gzip" | "zstd";

	try {
		mode = mayUseZstd ? "zstd" : "gzip";
		compressionStreamer = new CompressionStream(mode);
	} catch {
		// "zstd" isn't supported
		mode = "gzip";
		compressionStreamer = new CompressionStream(mode);
	}

	const compressedStream = new Blob([src])
		.stream()
		.pipeThrough<Uint8Array<ArrayBuffer>>(compressionStreamer);

	return {
		buffer: await new Response(compressedStream).bytes(),
		mode,
	};
}

/** Uses either zstd or gzip for compression */
export async function compressTextBuffer(
	payload: CompressionPayload,
): Promise<CompressionResult> {
	if (process.env.DEPLOYMENT_PLATFORM === "server") {
		try {
			return compressWithBun(payload);
		} catch {
			// Fall back to node
			return compressWithNode(payload);
		}
	} else {
		if (typeof globalThis.CompressionStream === "function") {
			return compressWithCompressionStream(payload);
		} else {
			// Rely on node since that's what stuff like vercel use
			return compressWithNode(payload);
		}
	}
}
