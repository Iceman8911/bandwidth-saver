/** If the request did not succeed, return `null` instead of the failed response */
export type ImageCompressionAdapter = (
	originalUrl: string | URL,
	quality?: number,
) => Promise<Response | null>;
