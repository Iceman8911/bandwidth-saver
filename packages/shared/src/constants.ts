export const ImageCompressorEndpoint = {
	/** Not working :( */
	ALPACA_CDN: "https://spitting.alpacacdn.com",

	/** Has watermarks */
	FLY_IMG_IO: "https://demo.flyimg.io",
	WSRV_NL: "https://wsrv.nl",
} as const;
export type ImageCompressorEndpoint =
	(typeof ImageCompressorEndpoint)[keyof typeof ImageCompressorEndpoint];
// TODO: Add bandwidth hero service and maybe a custom selfhost one
