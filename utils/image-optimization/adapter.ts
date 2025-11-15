import type { ImageCompressionAdapter } from "@/models/image-optimization";
import { ImageCompressorEndpoint } from "@/shared/constants";

export const imageCompressionAdapterWsrvNl: ImageCompressionAdapter = async (
	url,
	quality = 75,
) => {
	const urlParams = new URLSearchParams();
	urlParams.append("url", `${url}`);
	urlParams.append("q", `${quality}`);

	const newUrl = `${ImageCompressorEndpoint.WSRV_NL}?${urlParams}`;

	const response = await fetch(newUrl);

	if (!response.ok) return null;

	return response;
};

export const imageCompressionAdapterAlpacaCdn: ImageCompressionAdapter = async (
	url,
) => {
	const urlParams = new URLSearchParams();
	urlParams.append("url", `${url}`);

	const newUrl = `${ImageCompressorEndpoint.ALPACA_CDN}?${urlParams}`;

	const response = await fetch(newUrl);

	if (!response.ok) return null;

	return response;
};
