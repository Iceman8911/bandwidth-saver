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

type SiteSaveDataOption = { url: UrlSchema; enabled: boolean };

function getSiteSaveDataRules(
	options: ReadonlyArray<SiteSaveDataOption>,
): Browser.declarativeNetRequest.UpdateRuleOptions {
	const [enabledSites, disabledSites] = options.reduce<
		[UrlSchema[], UrlSchema[]]
	>(
		(urlGroup, { enabled, url }) => {
			if (enabled) urlGroup[0].push(url);
			else urlGroup[1].push(url);

			return urlGroup;
		},
		[[], []],
	);

	return {
		addRules: options.length
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
							initiatorDomains: enabledSites,
							resourceTypes: RESOURCE_TYPES,
						},
						id: DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_ADD,
						priority: DeclarativeNetRequestPriority.LOW,
					},

					{
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
					},
				]
			: undefined,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_ADD,
			DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER_REMOVE,
		],
	};
}

async function toggleSaveDataOnStartup() {
	const { saveData } = await globalSettingsStorageItem.getValue();

	declarativeNetRequestSafeUpdateDynamicRules(getGlobalSaveDataRules(saveData));

	const siteSaveDataOptionPromises: Promise<SiteSaveDataOption>[] = [];

	for (const url of await getSiteUrlOriginsFromStorage()) {
		const saveDataOptionPromise: Promise<SiteSaveDataOption> =
			getSiteScopedGlobalSettingsStorageItem(url)
				.getValue()
				.then((setting) => ({ enabled: setting.saveData, url }));

		siteSaveDataOptionPromises.push(saveDataOptionPromise);
	}

	declarativeNetRequestSafeUpdateDynamicRules(
		getSiteSaveDataRules(await Promise.all(siteSaveDataOptionPromises)),
	);
}

export async function saveDataToggleWatcher() {
	await toggleSaveDataOnStartup();

	globalSettingsStorageItem.watch(({ saveData }) => {
		declarativeNetRequestSafeUpdateDynamicRules(
			getGlobalSaveDataRules(saveData),
		);
	});

	watchChangesToSiteSpecificSettings((changes) => {
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

		declarativeNetRequestSafeUpdateDynamicRules(getSiteSaveDataRules(options));
	});
}
