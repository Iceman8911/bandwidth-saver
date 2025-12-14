export enum ImageCompressorEndpoint {
	/** Has watermarks but depending on the image, it may be unnoticable
	 *
	 * No animation support
	 *
	 * No default url support
	 */
	FLY_IMG_IO = "https://demo.flyimg.io",

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

	/** The most reliable */
	DEFAULT = WSRV_NL,

	/** Second most reliable */
	BACKUP = SERVE_PROXY,
}
// TODO: Add bandwidth hero service and maybe a custom selfhost one

export enum ServerAPIEndpoint {
	COMPRESS_IMAGE = "compress-image",
}

/** Any urls with this query param will not be redirected by the extension */
export const REDIRECTED_SEARCH_PARAM_FLAG = "bwsvr8911-flag=no-redirect";
