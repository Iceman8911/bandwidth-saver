import type {
	ImageCompressionPayloadSchema,
	ServerAPIEndpoint,
	UrlSchema,
} from "@bandwidth-saver/shared";
import type { ReadonlyDeep } from "type-fest";

type ProxyUrlConstructorPayload = ReadonlyDeep<
	{
		proxy: { host: string; port: `${number}` | number };
	} & {
		payload: ImageCompressionPayloadSchema;
		endpoint: ServerAPIEndpoint.PROCESS_IMAGE;
	}
>;

export function proxyUrlConstructor({
	endpoint,
	payload,
	proxy: { host, port },
}: ProxyUrlConstructorPayload): UrlSchema {
	// TODO: Add a better way to determine the protocol
	const urlWithoutQueryString =
		host === "localhost" || host === "127.0.0.1"
			? (`http://${host}:${port}/${endpoint}` as const)
			: (`https://${host}/${endpoint}` as const);

	const queryString = Object.entries(payload)
		.map(([key, entry]) => `${key}=${entry}`)
		.join("&");

	return `${urlWithoutQueryString}?${queryString}` as UrlSchema;
}
