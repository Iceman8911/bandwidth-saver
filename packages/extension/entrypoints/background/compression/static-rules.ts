import {
	ImageCompressorEndpoint,
	REDIRECTED_SEARCH_PARAM_FLAG,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import DEFAULT_COMPRESSION_WHITELISTED_DOMAINS from "@/data/compression-whilelisted-domains.json";
import { CompressionWhitelistedDomainSchema } from "@/models/external-data";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
	UPDATE_INTERVAL_IN_MS,
} from "@/shared/constants";
import { declarativeNetRequestSafeUpdateDynamicRules } from "@/shared/extension-api";

let {
	domains: WHITELISTED_REQUEST_DOMAINS,
}: CompressionWhitelistedDomainSchema = (() => {
	setInterval(async () => {
		try {
			const possibleUpdatedJson = v.parse(
				CompressionWhitelistedDomainSchema,
				await (
					await fetch(
						"https://raw.githubusercontent.com/iceman8911/bandwidth-saver/main/packages/extension/data/compression-whilelisted-domains.json",
					)
				).json(),
			);

			if (
				possibleUpdatedJson.version >
				DEFAULT_COMPRESSION_WHITELISTED_DOMAINS.version
			) {
				WHITELISTED_REQUEST_DOMAINS = possibleUpdatedJson.domains;

				for (const rule of createStaticRules()) {
					declarativeNetRequestSafeUpdateDynamicRules(rule);
				}
			}
		} catch {}
	}, UPDATE_INTERVAL_IN_MS);

	return DEFAULT_COMPRESSION_WHITELISTED_DOMAINS;
})();

/** These rules are basically to prevent useless redirects / redirect looping */
function createStaticRules(): Browser.declarativeNetRequest.UpdateRuleOptions[] {
	return [
		{
			addRules: [
				{
					action: { type: "allow" },
					condition: {
						requestDomains: [...WHITELISTED_REQUEST_DOMAINS],
						resourceTypes: ["image"],
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.MID,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
			],
		},

		// To prevent looping when the default image that failed to be compressed is returned
		{
			addRules: [
				{
					action: { type: "allow" },
					condition: {
						regexFilter: REDIRECTED_SEARCH_PARAM_FLAG,
						resourceTypes: ["image"],
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
						regexFilter: ".*\\.ico$",
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_FAVICONS_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.HIGHEST,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_FAVICONS_FROM_COMPRESSION,
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
						requestDomains: Object.values(ImageCompressorEndpoint).map(
							(endpoint) => new URL(endpoint).host,
						),
						urlFilter: "*",
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_COMPRESSION_ENDPOINTS_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.HIGHEST,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_COMPRESSION_ENDPOINTS_FROM_COMPRESSION,
			],
		},
	];
}

export function registerStaticRules() {
	for (const rule of createStaticRules()) {
		declarativeNetRequestSafeUpdateDynamicRules(rule);
	}
}
