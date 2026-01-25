import { DUMMY_TAB_URL } from "@/shared/constants";

export async function getActiveTabUrl(): Promise<URL> {
	try {
		const tabs = await browser.tabs.query({
			active: true,
			currentWindow: true,
		});
		const activeTab = tabs[0];

		return new URL(activeTab?.url ?? DUMMY_TAB_URL);
	} catch {
		return new URL(location.href);
	}
}
