import ky, { type Options as KyOptions } from "ky";

const NO_RETRY_OPTIONS = {
	retry: 0,
	timeout: 5000,
} as const satisfies KyOptions;

export async function checkIfUrlReturnsValidResponse(
	url: string,
): Promise<{ success: true; url: string } | { success: false }> {
	try {
		const response = await ky.head(url, NO_RETRY_OPTIONS);
		if (response.ok) {
			return { success: true, url };
		}
		return { success: false };
	} catch {
		return { success: false };
	}
}
