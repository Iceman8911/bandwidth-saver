import type {
	ImageCompressionPayloadSchema,
	ServerAPIEndpoint,
	UrlSchema,
} from "@bandwidth-saver/shared";
import type { ReadonlyDeep } from "type-fest";

type ProxyUrlConstructorPayload = ReadonlyDeep<{
	endpoint: UrlSchema;
	payload: ImageCompressionPayloadSchema;
	path: ServerAPIEndpoint.PROCESS_IMAGE;
}>;

export function proxyUrlConstructor({
	path,
	payload,
	endpoint,
}: ProxyUrlConstructorPayload): UrlSchema {
	const urlWithoutQueryString = `${endpoint}/${path}`;

	const queryString = Object.entries(payload)
		.map(([key, entry]) => `${key}=${entry}`)
		.join("&");

	return `${urlWithoutQueryString}?${queryString}` as UrlSchema;
}
