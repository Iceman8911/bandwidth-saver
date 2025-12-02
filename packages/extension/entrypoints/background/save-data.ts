import type { UrlSchema } from "@bandwidth-saver/shared";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { declarativeNetRequestSafeUpdateDynamicRules } from "@/shared/extension-api";
import {
	getSiteScopedGlobalSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";
import { watchChangesToSiteSpecificSettings } from "@/utils/storage";

const declarativeNetRequest = browser.declarativeNetRequest;

const RESOURCE_TYPES = Object.values(declarativeNetRequest.ResourceType);

type SiteSaveDataOption = { url: UrlSchema; enabled: boolean };

async function mergeSiteOptions(
	newOptions: ReadonlyArray<SiteSaveDataOption>,
): Promise<{ enabledSites: UrlSchema[]; disabledSites: UrlSchema[] }> {
	const existingRules = await browser.declarativeNetRequest.getDynamicRules();

	const oldEnabledSites = new Set<UrlSchema>();
	const oldDisabledSites = new Set<UrlSchema>();

	for (const rule of existingRules) {
		if (rule.id === DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_ADD) {
			for (const domain of rule.condition.initiatorDomains ?? []) {
				oldEnabledSites.add(domain as UrlSchema);
			}
		}
		if (rule.id === DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_REMOVE) {
			for (const domain of rule.condition.initiatorDomains ?? []) {
				oldDisabledSites.add(domain as UrlSchema);
			}
		}
	}

	for (const { url, enabled } of newOptions) {
		if (enabled) {
			oldEnabledSites.add(url);
			oldDisabledSites.delete(url);
		} else {
			oldDisabledSites.add(url);
			oldEnabledSites.delete(url);
		}
	}

	return {
		disabledSites: Array.from(oldDisabledSites),
		enabledSites: Array.from(oldEnabledSites),
	};
}

function getGlobalSaveDataRules(
	enabled: boolean,
): Browser.declarativeNetRequest.UpdateRuleOptions {
	return {
		addRules: enabled
			? [
					{
						action: {
							requestHeaders: [
								{
									header: "Save-Data",
									operation: "set",
									value: "on",
								},
							],
							type: "modifyHeaders",
						},
						condition: {
							resourceTypes: RESOURCE_TYPES,
							urlFilter: "*",
						},
						id: DeclarativeNetRequestRuleIds.GLOBAL_SAVE_DATA_HEADER,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.GLOBAL_SAVE_DATA_HEADER],
	};
}

async function getSiteSaveDataRules(
	options: ReadonlyArray<SiteSaveDataOption>,
): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const { enabledSites, disabledSites } = await mergeSiteOptions(options);

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];

	if (enabledSites.length) {
		rulesToAdd.push({
			action: {
				requestHeaders: [
					{
						header: "Save-Data",
						operation: "set",
						value: "on",
					},
				],
				type: "modifyHeaders",
			},
			condition: {
				initiatorDomains: enabledSites,
				resourceTypes: RESOURCE_TYPES,
			},
			id: DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_ADD,
			priority: DeclarativeNetRequestPriority.LOW,
		});
	}

	if (disabledSites.length) {
		rulesToAdd.push({
			action: {
				requestHeaders: [
					{
						header: "Save-Data",
						operation: "remove",
					},
				],
				type: "modifyHeaders",
			},
			condition: {
				initiatorDomains: disabledSites,
				resourceTypes: RESOURCE_TYPES,
			},
			id: DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_REMOVE,
			priority: DeclarativeNetRequestPriority.LOW,
		});
	}

	return {
		addRules: rulesToAdd,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_ADD,
			DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_REMOVE,
		],
	};
}

async function toggleSaveDataOnStartup() {
	const { saveData } = await globalSettingsStorageItem.getValue();

	const globalPromise = declarativeNetRequestSafeUpdateDynamicRules(
		getGlobalSaveDataRules(saveData),
	);

	const siteSaveDataOptionPromises: Promise<SiteSaveDataOption>[] = [];

	for (const url of await getSiteUrlOriginsFromStorage()) {
		const saveDataOptionPromise: Promise<SiteSaveDataOption> =
			getSiteScopedGlobalSettingsStorageItem(url)
				.getValue()
				.then((setting) => ({ enabled: setting.saveData, url }));

		siteSaveDataOptionPromises.push(saveDataOptionPromise);
	}

	const sitePromise = declarativeNetRequestSafeUpdateDynamicRules(
		await getSiteSaveDataRules(await Promise.all(siteSaveDataOptionPromises)),
	);

	await Promise.all([globalPromise, sitePromise]);
}

export async function saveDataToggleWatcher() {
	await toggleSaveDataOnStartup();

	globalSettingsStorageItem.watch(({ saveData }) => {
		declarativeNetRequestSafeUpdateDynamicRules(
			getGlobalSaveDataRules(saveData),
		);
	});

	watchChangesToSiteSpecificSettings(async (changes) => {
		const options = changes.reduce<SiteSaveDataOption[]>(
			(options, settingsChange) => {
				if (settingsChange.type === "global") {
					options.push({
						enabled: settingsChange.change.newValue?.saveData ?? false,
						url: settingsChange.url,
					});
				}

				return options;
			},
			[],
		);

		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteSaveDataRules(options),
		);
	});
}
