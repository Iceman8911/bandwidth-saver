import type { UrlSchema } from "@bandwidth-saver/shared";
import { defineContentScript } from "wxt/utils/define-content-script";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { getActiveTabUrl } from "@/utils/tabs";
import { runContentScriptDomManipulations } from "./combined-dom-manip";
import { monitorBandwidthUsageViaContentScript } from "./statistics/bandwidth-monitoring";

const getDefaultAndSiteGeneralSettings = (url: UrlSchema) =>
	Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

export default defineContentScript({
	async main() {
		monitorBandwidthUsageViaContentScript();

		const PAGE_ORIGIN = (await getActiveTabUrl()).origin as UrlSchema;

		const [defaultSettings, siteSettings] =
			await getDefaultAndSiteGeneralSettings(PAGE_ORIGIN);

		runContentScriptDomManipulations({
			origin: PAGE_ORIGIN,
			settings: { default: defaultSettings, site: siteSettings },
		});
	},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
