export enum ImageCompressorEndpoint {
	WSRV_NL = "https://wsrv.nl/",
	ALPACA_CDN = "https://spitting.alpacacdn.com/",
}
// TODO: Add bandwidth hero service and maybe a custom selfhost one

export enum MessageType {
	/** Check if the url returns a valid response code */
	VALIDATE_URL,
}
