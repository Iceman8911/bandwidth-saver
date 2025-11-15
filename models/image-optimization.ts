import type { UrlSchema } from "./shared";

/** Every image compression adapter must return a url that when fetched, returns the compressed image. */
export type ImageCompressionAdapter = (
	originalUrl: string | URL,
	quality?: number,
) => Promise<UrlSchema | null>;
