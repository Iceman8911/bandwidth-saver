import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { browser } from "wxt/browser";
import { DUMMY_TAB_URL } from "@/shared/constants";

export async function getActiveTabUrlString(): Promise<UrlSchema> {
	try {
		const tabs = await browser.tabs.query({
			active: true,
			currentWindow: true,
		});
		const activeTab = tabs[0];

		return v.parse(UrlSchema, activeTab?.url ?? DUMMY_TAB_URL);
	} catch {
		return v.parse(UrlSchema, location.href);
	}
}
