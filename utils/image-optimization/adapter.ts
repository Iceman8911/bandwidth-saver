import type { ImageCompressionAdapter } from "@/models/image-optimization";
import { ImageCompressorEndpoint } from "@/shared/constants";
import { convertBlobToBase64 } from "../blob";
import { fetchWithTimeout } from "../fetch";

const REQUEST_TIMEOUT = 3000;

export const imageCompressionAdapterWsrvNl: ImageCompressionAdapter = async (
	url,
	quality = 75,
) => {
	const urlParams = new URLSearchParams();
	urlParams.append("url", `${url}`);
	urlParams.append("q", `${quality}`);

	const newUrl = `${ImageCompressorEndpoint.WSRV_NL}?${urlParams}`;

	const response = await fetchWithTimeout(REQUEST_TIMEOUT, newUrl);

	if (!response.ok) return null;

	return convertBlobToBase64(await response.blob());
};

export const imageCompressionAdapterAlpacaCdn: ImageCompressionAdapter = async (
	url,
) => {
	const urlParams = new URLSearchParams();
	urlParams.append("url", `${url}`);

	const newUrl = `${ImageCompressorEndpoint.ALPACA_CDN}?${urlParams}`;

	const response = await fetchWithTimeout(REQUEST_TIMEOUT, newUrl);

	if (!response.ok) return null;

	return convertBlobToBase64(await response.blob());
};
