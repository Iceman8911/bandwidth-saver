import type { DEFAULT_COMPRESSION_SETTINGS } from "@/models/storage";
import {
	CompressionMode,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	defaultCompressionSettingsStorageItem,
	defaultGeneralSettingsStorageItem,
	defaultProxySettingsStorageItem,
} from "@/shared/storage";
import { watchChangesToSiteSpecificSettings } from "@/utils/storage";
import {
	applyDefaultProxyCompressionRules,
	applySiteProxyCompressionRules,
} from "./proxy";
import {
	applyDefaultSimpleCompressionRules,
	applySiteSimpleCompressionRules,
} from "./simple-mode";

const { SIMPLE, PROXY } = CompressionMode;

/**
 * Generates an array of rule IDs from a base ID to its end marker (inclusive).
 */
function generateRuleIdRange(baseRuleId: number, endRuleId: number): number[] {
	const ids: number[] = [];
	for (let id = baseRuleId; id <= endRuleId; id++) {
		ids.push(id);
	}
	return ids;
}

/**
 * Gets all site-specific compression rule IDs that should be cleared.
 * Includes both SIMPLE and PROXY mode site rules.
 */
function getAllSiteCompressionRuleIds(): number[] {
	return [
		...generateRuleIdRange(
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE,
			DeclarativeNetRequestRuleIds._$END_SITE_COMPRESSION_MODE_SIMPLE,
		),
		...generateRuleIdRange(
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY,
			DeclarativeNetRequestRuleIds._$END_SITE_COMPRESSION_MODE_PROXY,
		),
	];
}

/**
 * Clears ALL site-specific compression rules (both SIMPLE and PROXY modes).
 * This ensures clean state when switching modes or updating rules.
 */
async function clearAllSiteCompressionRules(): Promise<void> {
	const allCompressionRuleIds = getAllSiteCompressionRuleIds();

	await browser.declarativeNetRequest.updateSessionRules({
		removeRuleIds: allCompressionRuleIds,
	});
}

/**
 * Unified function to apply compression rules based on the current mode.
 * This prevents race conditions by coordinating both SIMPLE and PROXY modes.
 *
 * @param compressionEnabled - Whether compression is globally enabled
 * @param compressionSettings - Current compression settings
 * @param proxySettings - Current proxy settings (optional, fetched if not provided)
 */
export async function applyCompressionRules(
	compressionEnabled: boolean,
	compressionSettings: typeof DEFAULT_COMPRESSION_SETTINGS,
	proxySettings?: Parameters<typeof applyDefaultProxyCompressionRules>[2],
): Promise<void> {
	const { mode } = compressionSettings;

	// Clear ALL site rules first to prevent stale rules from other modes
	await clearAllSiteCompressionRules();

	// Apply default rules for the current mode (and remove rules from other modes)
	if (mode === SIMPLE) {
		await applyDefaultSimpleCompressionRules(
			compressionEnabled,
			compressionSettings,
		);
		await applySiteSimpleCompressionRules(compressionSettings);
	} else if (mode === PROXY) {
		const proxy =
			proxySettings ?? (await defaultProxySettingsStorageItem.getValue());
		await applyDefaultProxyCompressionRules(
			compressionEnabled,
			compressionSettings,
			proxy,
		);
		await applySiteProxyCompressionRules();
	}

	// Ensure rules from inactive modes are removed
	if (mode !== SIMPLE) {
		await browser.declarativeNetRequest.updateSessionRules({
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
			],
		});
	}
	if (mode !== PROXY) {
		await browser.declarativeNetRequest.updateSessionRules({
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
			],
		});
	}
}

/**
 * Initializes and manages compression rules.
 *
 * This unified watcher:
 * 1. Applies initial compression rules on startup
 * 2. Watches for changes to global compression settings
 * 3. Watches for changes to site-specific settings
 * 4. Reapplies BOTH default and site-specific rules when settings change
 *    (fixing the stale excludedInitiatorDomains issue)
 */
export async function compressionToggleWatcher(): Promise<void> {
	// Initial application on startup
	const [{ compression }, compressionSettings, proxySettings] =
		await Promise.all([
			defaultGeneralSettingsStorageItem.getValue(),
			defaultCompressionSettingsStorageItem.getValue(),
			defaultProxySettingsStorageItem.getValue(),
		]);

	await applyCompressionRules(compression, compressionSettings, proxySettings);

	// Cache current values for change detection
	let cachedEnabled = compression;
	let cachedCompressionSettings = compressionSettings;
	let cachedProxySettings = proxySettings;

	// Watch for changes to global general settings (compression enabled/disabled)
	defaultGeneralSettingsStorageItem.watch(
		async ({ compression: newEnabled }) => {
			cachedEnabled = newEnabled;
			await applyCompressionRules(
				cachedEnabled,
				cachedCompressionSettings,
				cachedProxySettings,
			);
		},
	);

	// Watch for changes to global compression settings (mode, quality, format, etc.)
	defaultCompressionSettingsStorageItem.watch(async (newSettings) => {
		cachedCompressionSettings = newSettings;
		await applyCompressionRules(
			cachedEnabled,
			cachedCompressionSettings,
			cachedProxySettings,
		);
	});

	// Watch for changes to global proxy settings
	defaultProxySettingsStorageItem.watch(async (newProxySettings) => {
		cachedProxySettings = newProxySettings;
		await applyCompressionRules(
			cachedEnabled,
			cachedCompressionSettings,
			cachedProxySettings,
		);
	});

	// Watch for changes to site-specific settings
	// This reapplies BOTH default and site rules, fixing the stale excludedInitiatorDomains issue
	watchChangesToSiteSpecificSettings(async () => {
		await applyCompressionRules(
			cachedEnabled,
			cachedCompressionSettings,
			cachedProxySettings,
		);
	});
}
