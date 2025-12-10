export enum ImageCompressorEndpoint {
	/** Not working :( */
	ALPACA_CDN = "https://spitting.alpacacdn.com",

	/** Has watermarks */
	FLY_IMG_IO = "https://demo.flyimg.io",
	WSRV_NL = "https://wsrv.nl",

	DEFAULT = WSRV_NL,
}
// TODO: Add bandwidth hero service and maybe a custom selfhost one

export enum ServerAPIEndpoint {
	COMPRESS_IMAGE = "compress-image",
}

/** Any urls with this query param will not be redirected by the extension */
export const REDIRECTED_SEARCH_PARAM_FLAG = "bwsvr8911-flag=no-redirect";
