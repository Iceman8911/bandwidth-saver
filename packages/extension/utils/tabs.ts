import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";

export async function getActiveTabOrigin(): Promise<UrlSchema | null> {
	const tabs = await browser.tabs.query({ active: true, currentWindow: true });
	const activeTab = tabs[0];

	if (!activeTab?.url) return null;

	const url = new URL(activeTab.url);

	return v.parse(UrlSchema, url.origin);
}
