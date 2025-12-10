import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	REDIRECTED_SEARCH_PARAM_FLAG,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import type { DEFAULT_COMPRESSION_SETTINGS } from "@/models/storage";
import {
	CompressionMode,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
	NOOP_RULE_CONDITION,
} from "@/shared/constants";
import {
	getSiteSpecificCompressionSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import {
	getSiteDomainsToNotApplyDefaultRule,
	getSiteUrlOriginsFromStorage,
} from "@/utils/storage";

const { SIMPLE: SIMPLE_MODE } = CompressionMode;

const declarativeNetRequest = browser.declarativeNetRequest;

const IMAGE_URL_REGEX =
	"(https?://.+\\.(png|jpg|jpeg|gif|webp|avif))(?:\\?.*)?$";

const BASE_URL_WITHOUT_QUERY_STRING = "\\1" as UrlSchema;

const BASE_URL_WITH_FLAG = `\\1#${REDIRECTED_SEARCH_PARAM_FLAG}` as UrlSchema;

/**
 * Applies the default (global) simple compression rule.
 *
 * This rule redirects image requests to the preferred compression endpoint
 * for all sites that don't have site-specific settings (useDefaultRules=true).
 *
 * @param enabled - Whether compression is globally enabled
 * @param config - Current compression settings
 */
export async function applyDefaultSimpleCompressionRules(
	enabled: boolean,
	config: typeof DEFAULT_COMPRESSION_SETTINGS,
): Promise<void> {
	const { format, preferredEndpoint, preserveAnim, quality, mode } = config;

	// Only apply if SIMPLE mode is active
	if (mode !== SIMPLE_MODE) {
		await declarativeNetRequest.updateSessionRules({
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
			],
		});
		return;
	}

	// Get domains that have custom settings (useDefaultRules=false)
	const excludedDomains = [...(await getSiteDomainsToNotApplyDefaultRule())];

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

	const preferredEndpointDomain = preferredEndpoint.replace(/^https?:\/\//, "");

	await declarativeNetRequest.updateSessionRules({
		addRules: enabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: urlConstructor({
									default_bwsvr8911: BASE_URL_WITH_FLAG,
									format_bwsvr8911: format,
									preserveAnim_bwsvr8911: preserveAnim,
									quality_bwsvr8911: quality,
									url_bwsvr8911: BASE_URL_WITHOUT_QUERY_STRING,
								}),
							},
							type: "redirect",
						},
						condition: {
							excludedInitiatorDomains: excludedDomains.length
								? [...excludedDomains, preferredEndpointDomain]
								: [preferredEndpointDomain],
							excludedRequestDomains: [preferredEndpointDomain],
							regexFilter: IMAGE_URL_REGEX,
							resourceTypes: ["image"],
						},
						id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
		],
	});
}

/**
 * Applies site-specific simple compression rules.
 *
 * These rules are applied to sites that have custom settings (useDefaultRules=false).
 * Each site gets its own rule with its specific compression settings.
 *
 * Note: The unified compression manager in index.ts is responsible for clearing
 * all site compression rule IDs before calling this function.
 *
 * @param globalConfig - Global compression settings (used for preferred endpoint)
 */
export async function applySiteSimpleCompressionRules(
	globalConfig: typeof DEFAULT_COMPRESSION_SETTINGS,
): Promise<void> {
	const { preferredEndpoint, mode } = globalConfig;

	// Only apply if SIMPLE mode is active
	if (mode !== SIMPLE_MODE) {
		return;
	}

	const preferredEndpointDomain = preferredEndpoint.replace(/^https?:\/\//, "");

	const urls = await getSiteUrlOriginsFromStorage();

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];
	let ruleIncrementer = 0;

	for (const url of urls) {
		const [{ useDefaultRules, compression }, siteCompressionSettings] =
			await Promise.all([
				getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
				getSiteSpecificCompressionSettingsStorageItem(url).getValue(),
			]);

		// Only create rules for sites with custom settings
		if (!useDefaultRules) {
			const {
				format,
				preserveAnim,
				quality,
				mode: siteMode,
			} = siteCompressionSettings;

			// Check if this site should use SIMPLE mode and has compression enabled
			const shouldApplyRule = compression && siteMode === SIMPLE_MODE;

			const urlConstructor =
				IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

			const rule: Browser.declarativeNetRequest.Rule = {
				action: {
					redirect: {
						regexSubstitution: urlConstructor({
							default_bwsvr8911: BASE_URL_WITH_FLAG,
							format_bwsvr8911: format,
							preserveAnim_bwsvr8911: preserveAnim,
							quality_bwsvr8911: quality,
							url_bwsvr8911: BASE_URL_WITHOUT_QUERY_STRING,
						}),
					},
					type: "redirect",
				},
				condition: {
					excludedRequestDomains: [preferredEndpointDomain],
					initiatorDomains: [new URL(url).host],
					regexFilter: IMAGE_URL_REGEX,
					resourceTypes: ["image"],
					// Add NOOP condition if compression is disabled or site uses different mode
					...(shouldApplyRule ? {} : NOOP_RULE_CONDITION),
				},
				id:
					DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE +
					ruleIncrementer,
				priority: DeclarativeNetRequestPriority.LOWEST,
			};

			rulesToAdd.push(rule);
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
