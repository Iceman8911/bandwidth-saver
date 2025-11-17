export enum ImageCompressorEndpoint {
	WSRV_NL = "https://wsrv.nl/",
	ALPACA_CDN = "https://spitting.alpacacdn.com/",

	/** Used in `simple` mode since we can't dynamically calculate the one to use */
	DEFAULT = WSRV_NL,
}
// TODO: Add bandwidth hero service and maybe a custom selfhost one
