import type { UrlOutput } from "@bandwidth-saver/shared";
import { defineContentScript } from "wxt/utils/define-content-script";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { getActiveTabUrlString } from "@/utils/tabs";
import { getUrlSchemaOrigin } from "@/utils/url";
import { runContentScriptDomManipulations } from "./combined-dom-manip";
import { injectMainWorldScriptsViaContentScript } from "./script-injectors";
import { monitorBandwidthUsageViaContentScript } from "./statistics/bandwidth-monitoring";

const getDefaultAndSiteGeneralSettings = (url: UrlOutput) =>
	Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

export default defineContentScript({
	async main() {
		monitorBandwidthUsageViaContentScript();

		const PAGE_ORIGIN = getUrlSchemaOrigin(await getActiveTabUrlString());

		const [defaultSettings, siteSettings] =
			await getDefaultAndSiteGeneralSettings(PAGE_ORIGIN);

		const payload = {
			origin: PAGE_ORIGIN,
			settings: { default: defaultSettings, site: siteSettings },
		};

		runContentScriptDomManipulations(payload);

		await injectMainWorldScriptsViaContentScript(payload);
	},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
