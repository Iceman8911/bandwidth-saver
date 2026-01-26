import type { UrlSchema } from "@bandwidth-saver/shared";
import { type Browser, browser } from "wxt/browser";
import {
	defaultCompressionSettingsStorageItem,
	defaultGeneralSettingsStorageItem,
} from "@/shared/storage";
import { applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites } from "@/utils/dnr-rules";
import { watchChangesToSiteSpecificGeneralSettings } from "@/utils/storage";
import {
	getDefaultProxyCompressionRules,
	getSiteProxyCompressionRules,
} from "./proxy-mode";
import {
	getDefaultSimpleCompressionRules,
	getSiteSimpleCompressionRules,
} from "./simple-mode";

function combineRuleUpdateOptionsTogether(
	...ruleUpdates: ReadonlyArray<Browser.declarativeNetRequest.UpdateRuleOptions>
): Browser.declarativeNetRequest.UpdateRuleOptions {
	return ruleUpdates.reduce(
		(combinedRuleUpdate, { addRules = [], removeRuleIds = [] }) => {
			combinedRuleUpdate.addRules?.push(...addRules);
			combinedRuleUpdate.removeRuleIds?.push(...removeRuleIds);

			return combinedRuleUpdate;
		},
		{ addRules: [], removeRuleIds: [] },
	);
}

async function applyDefaultCompressionRules() {
	const [simpleModeDefaultUpdateRule, proxyModeDefaultUpdateRule] =
		await Promise.all([
			getDefaultSimpleCompressionRules(),
			getDefaultProxyCompressionRules(),
		]);

	await browser.declarativeNetRequest.updateSessionRules(
		combineRuleUpdateOptionsTogether(
			simpleModeDefaultUpdateRule,
			proxyModeDefaultUpdateRule,
		),
	);
}

async function getSiteCompressionRules(url: UrlSchema) {
	const [simpleModeSiteSpecificUpdateRule, proxyModeSiteSpecificUpdateRule] =
		await Promise.all([
			getSiteSimpleCompressionRules(url),
			getSiteProxyCompressionRules(url),
		]);

	return combineRuleUpdateOptionsTogether(
		simpleModeSiteSpecificUpdateRule,
		proxyModeSiteSpecificUpdateRule,
	);
}

async function applyAllCompressionRules() {
	await applyDefaultCompressionRules();

	await applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites((url) =>
		getSiteCompressionRules(url),
	);
}

async function toggleCompressionOnStartup() {
	await applyAllCompressionRules();
}

export async function compressionToggleWatcher() {
	await toggleCompressionOnStartup();

	defaultGeneralSettingsStorageItem.watch(() => applyDefaultCompressionRules());
	defaultCompressionSettingsStorageItem.watch(() =>
		applyDefaultCompressionRules(),
	);

	watchChangesToSiteSpecificGeneralSettings(() => applyAllCompressionRules());
}
