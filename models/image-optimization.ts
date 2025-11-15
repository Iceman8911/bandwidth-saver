import type { Base64Schema } from "./shared";

export type ImageCompressionAdapter = (
	originalUrl: string | URL,
	quality?: number,
) => Promise<Base64Schema | null>;
