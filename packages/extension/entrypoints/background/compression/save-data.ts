import type { UrlSchema } from "@bandwidth-saver/shared";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	getSiteScopedGlobalSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";
import { watchChangesToSiteSpecificSettings } from "@/utils/storage";

const declarativeNetRequest = browser.declarativeNetRequest;

const {
	GLOBAL_SAVE_DATA_HEADER,
	SITE_SAVE_DATA_HEADER_ADD,
	SITE_SAVE_DATA_HEADER_REMOVE,
} = DeclarativeNetRequestRuleIds;
const { LOWEST, LOW } = DeclarativeNetRequestPriority;

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
						id: GLOBAL_SAVE_DATA_HEADER,
						priority: LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [GLOBAL_SAVE_DATA_HEADER],
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
						id: SITE_SAVE_DATA_HEADER_ADD,
						priority: LOW,
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
						id: SITE_SAVE_DATA_HEADER_REMOVE,
						priority: LOW,
					},
				]
			: undefined,
		removeRuleIds: [SITE_SAVE_DATA_HEADER_ADD, SITE_SAVE_DATA_HEADER_REMOVE],
	};
}

async function toggleSaveDataOnStartup() {
	const { saveData } = await globalSettingsStorageItem.getValue();

	declarativeNetRequest.updateDynamicRules(getGlobalSaveDataRules(saveData));

	const siteSaveDataOptionPromises: Promise<SiteSaveDataOption>[] = [];

	for (const url of await getSiteUrlOriginsFromStorage()) {
		const saveDataOptionPromise: Promise<SiteSaveDataOption> =
			getSiteScopedGlobalSettingsStorageItem(url)
				.getValue()
				.then((setting) => ({ enabled: setting.saveData, url }));

		siteSaveDataOptionPromises.push(saveDataOptionPromise);
	}

	declarativeNetRequest.updateDynamicRules(
		getSiteSaveDataRules(await Promise.all(siteSaveDataOptionPromises)),
	);
}

export async function saveDataToggleWatcher() {
	await toggleSaveDataOnStartup();

	globalSettingsStorageItem.watch(({ saveData }) => {
		declarativeNetRequest.updateDynamicRules(getGlobalSaveDataRules(saveData));
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

		declarativeNetRequest.updateDynamicRules(getSiteSaveDataRules(options));
	});
}
