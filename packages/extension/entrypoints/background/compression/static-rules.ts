import {
	ImageCompressorEndpoint,
	REDIRECTED_SEARCH_PARAM_FLAG,
} from "@bandwidth-saver/shared";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { getWhitelistedDomains } from "./whilisted-domains";

/** These rules are basically to prevent useless redirects / redirect looping */
function createStaticRules(): Browser.declarativeNetRequest.UpdateRuleOptions[] {
	return [
		// To prevent looping when the default image that failed to be compressed is returned
		{
			addRules: [
				{
					action: { type: "allow" },
					condition: {
						regexFilter: REDIRECTED_SEARCH_PARAM_FLAG,
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_FLAGGED_REQUESTS,
					priority: DeclarativeNetRequestPriority.HIGHEST,
				},
			],
			removeRuleIds: [DeclarativeNetRequestRuleIds.EXEMPT_FLAGGED_REQUESTS],
		},

		// Don't process favicons
		{
			addRules: [
				{
					action: {
						type: "allow",
					},
					condition: {
						regexFilter: ".*\\.ico(?:[?#].*)?$",
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_FAVICONS_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.HIGHEST,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_FAVICONS_FROM_COMPRESSION,
			],
		},
		{
			addRules: [
				{
					action: {
						type: "allow",
					},
					condition: {
						regexFilter: "^https?://[^/]+/.*_next/image(?:[/?#]|$)",
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_NEXT_JS_OPTIMIZED_IMAGES_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.HIGHEST,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_NEXT_JS_OPTIMIZED_IMAGES_FROM_COMPRESSION,
			],
		},

		// Don't process svgs
		{
			addRules: [
				{
					action: { type: "allow" },
					condition: { regexFilter: "^https?://.+\\.svg(?:[?#].*)?$" },
					id: DeclarativeNetRequestRuleIds.EXEMPT_SVGS_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.HIGHEST,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_SVGS_FROM_COMPRESSION,
			],
		},

		// Don't bother compressing already compressed requests
		{
			addRules: [
				{
					action: {
						type: "allow",
					},
					condition: {
						// Deduplicate domains since ImageCompressorEndpoint.DEFAULT equals WSRV_NL
						requestDomains: [
							...new Set(
								Object.values(ImageCompressorEndpoint).map(
									(endpoint) => new URL(endpoint).host,
								),
							),
						],
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_COMPRESSION_ENDPOINTS_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.HIGHEST,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_COMPRESSION_ENDPOINTS_FROM_COMPRESSION,
			],
		},

		// Don't process whitelisted domains (they won't work anyway)
		{
			addRules: [
				{
					action: { type: "allow" },
					condition: {
						requestDomains: [...getWhitelistedDomains()],
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.HIGHEST,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
			],
		},
	];
}

export function registerStaticRules() {
	for (const rule of createStaticRules()) {
		browser.declarativeNetRequest.updateSessionRules(rule);
	}
}
