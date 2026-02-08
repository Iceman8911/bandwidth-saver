import {
	IMAGE_COMPRESSOR_ENDPOINT_SET,
	REDIRECTED_SEARCH_PARAM_FLAG,
} from "@bandwidth-saver/shared";
import { type Browser, browser } from "wxt/browser";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { getWhitelistedDomains } from "./whilisted-domains";

const IMAGE_COMPRESSOR_ENDPOINT_HOSTS = Array.from(
	IMAGE_COMPRESSOR_ENDPOINT_SET,
	(endpoint) => new URL(endpoint).host,
);

/** These rules are basically to prevent useless redirects / redirect looping */
const STATIC_ISH_RULES = {
	addRules: [
		// To prevent looping when the default image that failed to be compressed is returned
		{
			action: { type: "allow" },
			condition: {
				regexFilter: REDIRECTED_SEARCH_PARAM_FLAG,
			},
			id: DeclarativeNetRequestRuleIds.EXEMPT_FLAGGED_REQUESTS,
			priority: DeclarativeNetRequestPriority.HIGHEST,
		},

		// Don't process favicons
		{
			action: {
				type: "allow",
			},
			condition: {
				urlFilter: ".ico^",
			},
			id: DeclarativeNetRequestRuleIds.EXEMPT_FAVICONS_FROM_COMPRESSION,
			priority: DeclarativeNetRequestPriority.HIGHEST,
		},
		{
			action: {
				type: "allow",
			},
			condition: {
				urlFilter: "/_next/image",
			},
			id: DeclarativeNetRequestRuleIds.EXEMPT_NEXT_JS_OPTIMIZED_IMAGES_FROM_COMPRESSION,
			// Put at mid so the proxy mode can override it
			priority: DeclarativeNetRequestPriority.MID,
		},

		// Don't process svgs
		{
			action: { type: "allow" },
			condition: {
				urlFilter: ".svg^",
			},
			id: DeclarativeNetRequestRuleIds.EXEMPT_SVGS_FROM_COMPRESSION,
			priority: DeclarativeNetRequestPriority.HIGHEST,
		},

		// Don't bother compressing already compressed requests
		{
			action: {
				type: "allow",
			},
			condition: {
				requestDomains: IMAGE_COMPRESSOR_ENDPOINT_HOSTS,
			},
			id: DeclarativeNetRequestRuleIds.EXEMPT_COMPRESSION_ENDPOINTS_FROM_COMPRESSION,
			priority: DeclarativeNetRequestPriority.HIGHEST,
		},

		// Don't process whitelisted domains (they won't work anyway)
		{
			action: { type: "allow" },
			condition: {
				requestDomains: [...getWhitelistedDomains()],
			},
			id: DeclarativeNetRequestRuleIds.EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
			// Put at mid so the proxy mode can override it
			priority: DeclarativeNetRequestPriority.MID,
		},

		// Don't touch recaptcha urls
		{
			action: { type: "allow" },
			condition: { urlFilter: "recaptcha" },
			id: DeclarativeNetRequestRuleIds.EXEMPT_RECAPTCHA_FROM_COMPRESSION,
			priority: DeclarativeNetRequestPriority.HIGHEST,
		},

		// Don't touch gstatic netcheck urls
		{
			action: { type: "allow" },
			condition: { urlFilter: "ssl.gstatic.com" },
			id: DeclarativeNetRequestRuleIds.EXEMPT_GSTATIC_NETCHECK_FROM_COMPRESSION,
			priority: DeclarativeNetRequestPriority.HIGHEST,
		},
	],
	removeRuleIds: [
		DeclarativeNetRequestRuleIds.EXEMPT_FLAGGED_REQUESTS,
		DeclarativeNetRequestRuleIds.EXEMPT_FAVICONS_FROM_COMPRESSION,
		DeclarativeNetRequestRuleIds.EXEMPT_NEXT_JS_OPTIMIZED_IMAGES_FROM_COMPRESSION,
		DeclarativeNetRequestRuleIds.EXEMPT_SVGS_FROM_COMPRESSION,
		DeclarativeNetRequestRuleIds.EXEMPT_COMPRESSION_ENDPOINTS_FROM_COMPRESSION,
		DeclarativeNetRequestRuleIds.EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
		DeclarativeNetRequestRuleIds.EXEMPT_RECAPTCHA_FROM_COMPRESSION,
		DeclarativeNetRequestRuleIds.EXEMPT_GSTATIC_NETCHECK_FROM_COMPRESSION,
	],
} satisfies Browser.declarativeNetRequest.UpdateRuleOptions;

export async function registerStaticRules() {
	return browser.declarativeNetRequest.updateSessionRules(STATIC_ISH_RULES);
}
