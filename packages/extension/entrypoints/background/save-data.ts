import type { UrlSchema } from "@bandwidth-saver/shared";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { declarativeNetRequestSafeUpdateDynamicRules } from "@/shared/extension-api";
import {
	getSiteSpecificSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";
import { watchChangesToSiteSpecificSettings } from "@/utils/storage";
import { getEnabledAndDisabledDomainsFromNewAndOldSiteOptions } from "./utils";

const declarativeNetRequest = browser.declarativeNetRequest;

const RESOURCE_TYPES = Object.values(declarativeNetRequest.ResourceType);

type SiteSaveDataOption = { url: UrlSchema; enabled: boolean };

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
	const { enabledDomains, disabledDomains } =
		await getEnabledAndDisabledDomainsFromNewAndOldSiteOptions(
			options,
			DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_ADD,
			DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_REMOVE,
		);

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];

	if (enabledDomains.length) {
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
				initiatorDomains: enabledDomains,
				resourceTypes: RESOURCE_TYPES,
			},
			id: DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_ADD,
			priority: DeclarativeNetRequestPriority.LOW,
		});
	}

	if (disabledDomains.length) {
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
				initiatorDomains: disabledDomains,
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
			getSiteSpecificSettingsStorageItem(url)
				.getValue()
				.then(({ saveData }) => ({ enabled: saveData, url }));

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
				options.push({
					enabled: settingsChange.change.newValue?.saveData ?? false,
					url: settingsChange.url,
				});

				return options;
			},
			[],
		);

		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteSaveDataRules(options),
		);
	});
}
