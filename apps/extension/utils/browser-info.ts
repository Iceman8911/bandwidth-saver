/** In cases where values are missing, they're pinned to 1 */
export interface BrowserMajorVersion {
	firefox: number;
	chrome: number;
	webkit: number;
}

const FIREFOX_MAJOR_VERSION_REGEX = /(?<=firefox\/)\d+/i;
const CHROME_MAJOR_VERSION_REGEX = /(?<=chrome\/)\d+/i;
const WEBKIT_MAJOR_VERSION_REGEX = /(?<=applewebkit\/)\d+/i;

export function getBrowserMajorVersion(
	/** For testing */
	defaultUserAgent?: string,
): Readonly<BrowserMajorVersion> {
	// e.g. Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0
	const userAgent = defaultUserAgent ?? navigator.userAgent;

	return {
		chrome: Number(userAgent?.match(CHROME_MAJOR_VERSION_REGEX)?.[0] || "1"),
		firefox: Number(userAgent?.match(FIREFOX_MAJOR_VERSION_REGEX)?.[0] || "1"),
		webkit: Number(userAgent?.match(WEBKIT_MAJOR_VERSION_REGEX)?.[0] || "1"),
	};
}
