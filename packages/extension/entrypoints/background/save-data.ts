import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites } from "@/utils/dnr-rules";
import {
	getSiteDomainsToNotApplyDefaultRule,
	watchChangesToSiteSpecificSettings,
} from "@/utils/storage";

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
			const { saveData, useDefaultRules } =
				await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

			const isEnabled = saveData && !useDefaultRules;

			if (!isEnabled) {
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
	const { saveData } = await defaultGeneralSettingsStorageItem.getValue();

	const defaultSaveDataRulePromise = applyDefaultSaveDataRules(saveData);

	const siteSaveDataOptionPromises = applySiteSaveDataRules();

	await Promise.all([defaultSaveDataRulePromise, siteSaveDataOptionPromises]);
}

export async function saveDataToggleWatcher() {
	await toggleSaveDataOnStartup();

	let cachedEnabled = (await defaultGeneralSettingsStorageItem.getValue())
		.bypassCsp;

	defaultGeneralSettingsStorageItem.watch(({ saveData }) => {
		cachedEnabled = saveData;
		applyDefaultSaveDataRules(saveData);
	});

	// Reapply BOTH default and site rules when site settings change
	// This fixes stale excludedInitiatorDomains when useDefaultRules changes
	watchChangesToSiteSpecificSettings(async () => {
		await applyAllSaveDataRules(cachedEnabled);
	});
}
