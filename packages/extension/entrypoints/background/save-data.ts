import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites } from "@/utils/dnr-rules";
import { watchChangesToSiteSpecificSettings } from "@/utils/storage";

const declarativeNetRequest = browser.declarativeNetRequest;

const RESOURCE_TYPES = Object.values(declarativeNetRequest.ResourceType);

/**
 * Applies both default and site-specific Save-Data rules.
 * This ensures excludedInitiatorDomains stays in sync when site settings change.
 */
async function applyAllSaveDataRules(enabled: boolean): Promise<void> {
	await applyDefaultSaveDataRules(enabled);
	await applySiteSaveDataRules();
}

async function applyDefaultSaveDataRules(enabled: boolean): Promise<void> {
	const excludedDomains = [...(await getSiteDomainsToNotApplyDefaultRule())];

	await browser.declarativeNetRequest.updateSessionRules({
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
							excludedInitiatorDomains: excludedDomains.length
								? excludedDomains
								: undefined,
							resourceTypes: RESOURCE_TYPES,
						},
						id: DeclarativeNetRequestRuleIds.DEFAULT_SAVE_DATA_HEADER,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.DEFAULT_SAVE_DATA_HEADER],
	});
}

async function applySiteSaveDataRules() {
	await applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites(
		async (url) => {
			const { saveData, ruleIdOffset, enabled } =
				await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

			const applySaveData = saveData && ruleIdOffset != null && enabled;

			if (!applySaveData) {
				return {
					removeRuleIds: [DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER],
				};
			}

			return {
				addRules: [
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
						},
						id: DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				],
				removeRuleIds: [DeclarativeNetRequestRuleIds.SITE_SAVE_DATA_HEADER],
			};
		},
	);
}

async function toggleSaveDataOnStartup() {
	const { saveData, enabled } =
		await defaultGeneralSettingsStorageItem.getValue();

	await applyAllSaveDataRules(saveData && enabled);
}

export async function saveDataToggleWatcher() {
	await toggleSaveDataOnStartup();

	const defaultSettings = await defaultGeneralSettingsStorageItem.getValue();
	let cachedEnabled = defaultSettings.saveData && defaultSettings.enabled;

	defaultGeneralSettingsStorageItem.watch(({ saveData, enabled }) => {
		cachedEnabled = saveData && enabled;
		applyDefaultSaveDataRules(cachedEnabled);
	});

	// Reapply BOTH default and site rules when site settings change
	// This fixes stale excludedInitiatorDomains when useDefaultRules changes
	watchChangesToSiteSpecificSettings(async () => {
		await applyAllSaveDataRules(cachedEnabled);
	});
}
