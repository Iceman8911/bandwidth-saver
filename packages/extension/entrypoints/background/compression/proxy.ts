import {
	customProxyUrlConstructor,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import type {
	DEFAULT_COMPRESSION_SETTINGS,
	DEFAULT_PROXY_SETTINGS,
} from "@/models/storage";
import {
	CompressionMode,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
	NOOP_RULE_CONDITION,
} from "@/shared/constants";
import {
	defaultProxySettingsStorageItem,
	getSiteSpecificCompressionSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
	getSiteSpecificProxySettingsStorageItem,
} from "@/shared/storage";
import {
	getSiteDomainsToNotApplyDefaultRule,
	getSiteUrlOriginsFromStorage,
} from "@/utils/storage";

const declarativeNetRequest = browser.declarativeNetRequest;

const { PROXY: PROXY_MODE } = CompressionMode;

const IMAGE_URL_REGEX =
	"(https?://.+\\.(png|jpg|jpeg|gif|webp|avif))(?:\\?.*)?$";

/**
 * Applies the default (global) proxy compression rule.
 *
 * This rule redirects image requests to the custom proxy server
 * for all sites that don't have site-specific settings (useDefaultRules=true).
 *
 * @param enabled - Whether compression is globally enabled
 * @param config - Current compression settings
 * @param proxy - Current proxy settings
 */
export async function applyDefaultProxyCompressionRules(
	enabled: boolean,
	config: typeof DEFAULT_COMPRESSION_SETTINGS,
	proxy: typeof DEFAULT_PROXY_SETTINGS,
): Promise<void> {
	const { format, preserveAnim, quality, mode } = config;

	// Only apply if PROXY mode is active
	if (mode !== PROXY_MODE) {
		await declarativeNetRequest.updateSessionRules({
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
			],
		});
		return;
	}

	const proxyUrl = customProxyUrlConstructor(
		{
			format_bwsvr8911: format,
			preserveAnim_bwsvr8911: preserveAnim,
			quality_bwsvr8911: quality,
			url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxy,
	);

	const proxyDomain = proxy.host.replace(/^https?:\/\//, "");

	// Get domains that have custom settings (useDefaultRules=false)
	const excludedDomains = [...(await getSiteDomainsToNotApplyDefaultRule())];

	await declarativeNetRequest.updateSessionRules({
		addRules: enabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: proxyUrl,
							},
							type: "redirect",
						},
						condition: {
							excludedInitiatorDomains: [
								proxyDomain,
								...(excludedDomains.length ? excludedDomains : []),
							],
							excludedRequestDomains: [proxyDomain],
							regexFilter: IMAGE_URL_REGEX,
						},
						id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY],
	});
}

/**
 * Applies site-specific proxy compression rules.
 *
 * These rules are applied to sites that have custom settings (useDefaultRules=false).
 * Each site gets its own rule with its specific compression and proxy settings.
 *
 * Note: The unified compression manager in index.ts is responsible for clearing
 * all site compression rule IDs before calling this function.
 */
export async function applySiteProxyCompressionRules(): Promise<void> {
	const globalProxySettings = await defaultProxySettingsStorageItem.getValue();
	const proxyDomain = globalProxySettings.host.replace(/^https?:\/\//, "");

	const urls = await getSiteUrlOriginsFromStorage();

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];
	let ruleIncrementer = 0;

	for (const url of urls) {
		const [
			{ useDefaultRules, compression },
			compressionSettings,
			proxySettings,
		] = await Promise.all([
			getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
			getSiteSpecificCompressionSettingsStorageItem(url).getValue(),
			getSiteSpecificProxySettingsStorageItem(url).getValue(),
		]);

		// Only create rules for sites with custom settings
		if (!useDefaultRules) {
			const { format, preserveAnim, quality, mode } = compressionSettings;

			// Check if this site should use PROXY mode and has compression enabled
			const shouldApplyRule = compression && mode === PROXY_MODE;

			if (shouldApplyRule) {
				const proxyUrl = customProxyUrlConstructor(
					{
						format_bwsvr8911: format,
						preserveAnim_bwsvr8911: preserveAnim,
						quality_bwsvr8911: quality,
						url_bwsvr8911: "\\0" as UrlSchema,
					},
					proxySettings,
				);

				const rule: Browser.declarativeNetRequest.Rule = {
					action: {
						redirect: {
							regexSubstitution: proxyUrl,
						},
						type: "redirect",
					},
					condition: {
						excludedRequestDomains: [proxyDomain],
						initiatorDomains: [new URL(url).host],
						regexFilter: IMAGE_URL_REGEX,
					},
					id:
						DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY +
						ruleIncrementer,
					priority: DeclarativeNetRequestPriority.LOWEST,
				};

				rulesToAdd.push(rule);
			} else {
				// Add NOOP rule for sites that have custom settings but don't use PROXY mode
				// or have compression disabled
				const rule: Browser.declarativeNetRequest.Rule = {
					action: {
						redirect: {
							regexSubstitution: "\\0",
						},
						type: "redirect",
					},
					condition: {
						...NOOP_RULE_CONDITION,
						excludedRequestDomains: [proxyDomain],
						initiatorDomains: [new URL(url).host],
						regexFilter: IMAGE_URL_REGEX,
					},
					id:
						DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY +
						ruleIncrementer,
					priority: DeclarativeNetRequestPriority.LOWEST,
				};

				rulesToAdd.push(rule);
			}

			ruleIncrementer++;
		}
	}

	// Add all rules in a single batch for efficiency
	if (rulesToAdd.length > 0) {
		await declarativeNetRequest.updateSessionRules({
			addRules: rulesToAdd,
		});
	}
}
