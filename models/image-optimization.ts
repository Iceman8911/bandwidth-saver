import type { DataUrlSchema } from "./shared";

export type ImageCompressionAdapter = (
	originalUrl: string | URL,
	quality?: number,
) => Promise<DataUrlSchema | null>;
