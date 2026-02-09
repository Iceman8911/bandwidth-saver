export enum ImageCompressorEndpoint {
	/** Has watermarks but depending on the image, it may be unnoticable
	 *
	 * No animation support
	 *
	 * No default url support
	 */
	FLY_IMG_IO = "https://demo.flyimg.io",

	/** Most consistent out of them all but has some issues with tiwtter, reddit, discord, etc
	 *
	 * Tbf, all the others also have problems with those, so I won't hold it against it.
	 */
	WSRV_NL = "https://wsrv.nl",

	/** Must trim out url protocol before it can be passed to this endpoint.
	 *
	 * Animation is enabled permanently.
	 *
	 * Defaults to the given url if it cannot optimize it (like Imgur stuff). Although, the default url should not have query strings since it may be truncated.
	 * Scratch that, this only happens sometimes :p.
	 *
	 * The only supported parameter that is relevant is `quality`.
	 */
	WORDPRESS = "https://i0.wp.com",

	/** Gif bring ORB errors but work properly if you test them in a different tab as the initiator domain???? Imgur stuff don't work either :(
	 *
	 * No default url support
	 */
	IMAGE_CDN = "https://icdn.dev",

	/** Doesn't support anything bar a single url parameter.
	 *
	 * Only works on images 8MB and below
	 */
	FLY_WEBP_CLOUD = "https://fly.webp.se/image",

	/** Only accepts a url to the image to compress.
	 *
	 * Has animation support forcefully enabled.
	 *
	 * Fails on images larger than 5 MB.
	 */
	SERVE_PROXY = "https://serveproxy.com",

	/** Requires a cloudinary public cloud name */
	CLOUDINARY = "https://res.cloudinary.com",

	/** The most reliable */
	DEFAULT = WSRV_NL,

	/** Second most reliable */
	BACKUP = SERVE_PROXY,
}
export const IMAGE_COMPRESSOR_ENDPOINT_SET: ReadonlySet<string> = new Set(
	Object.values(ImageCompressorEndpoint),
);
// TODO: Add bandwidth hero service and maybe a custom selfhost one

export enum ServerAPIEndpoint {
	HEALTH = "health",

	/** Compresses images */
	PROCESS_IMAGE = "image",
}

/** Any urls with this hash fragment will not be redirected by the extension */
export const REDIRECTED_SEARCH_PARAM_FLAG = "#bwsvr8911-flag-no-redirect";

export enum ProxyCustomHeaders {
	BYTES_SAVED = "x-bwsvr8911-bytes-saved",

	/** Either the url of a free compression endpoint or "none" or "self" */
	ENDPOINT_USED = "x-bwsvr8911-endpoint-used",
}

// Ensure that all the headers are lowercase
ProxyCustomHeaders satisfies Record<string, Lowercase<ProxyCustomHeaders>>;

/** Matches any extension preceded by a "." that is not in a query string / hash fragemnt but is at the end of the url string / right before a query string / has fragment */
export const URL_EXTENSION_REGEX = /(?<![?#].+)(?<=\.)\w+(?=[?#]|$)/g;
