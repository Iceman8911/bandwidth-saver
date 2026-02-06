import { ServerAPIEndpoint, type UrlSchema } from "@bandwidth-saver/shared";
import { browser } from "wxt/browser";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type {
	DefaultDnrRuleModifierPayload,
	SiteScopedDnrRuleModifierPayloadEntry,
} from "@/utils/dnr-rules";
import { getUrlSchemaHost } from "@/utils/url";
import { proxyUrlConstructor } from "./shared";

const URL_REGEX = `^(https?://.+)`;

export async function applyDefaultHtmlOptimizationRules({
	general: { enabled, optimizeHtml, bypassCsp },
	proxy: proxySettings,
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const isEnabled = enabled && optimizeHtml;

	const proxyUrl = proxyUrlConstructor({
		endpoint: ServerAPIEndpoint.PROCESS_HTML,
		payload: {
			stripCspMetaTag_bwsvr8911: bypassCsp,
			zz_url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxy: proxySettings,
	});
	const proxyDomain = getUrlSchemaHost(proxySettings.host);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: proxyUrl,
							},
							type: "redirect",
						},
						condition: {
							excludedInitiatorDomains: excludedDomains.concat(proxyDomain),
							excludedRequestDomains: [proxyDomain],
							regexFilter: URL_REGEX,
							resourceTypes: ["main_frame", "sub_frame"],
						},
						id: DeclarativeNetRequestRuleIds.DEFAULT_HTML_OPTIMIZATION,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.DEFAULT_HTML_OPTIMIZATION],
	});
}

export async function applySiteScopedHtmlOptimizationRules([
	host,
	{
		general: { enabled, optimizeHtml, useSiteRule, bypassCsp },
		ids: { optimizeHtml: optimizeHtmlId },
		proxy: proxySettings,
	},
]: SiteScopedDnrRuleModifierPayloadEntry) {
	const isEnabled = enabled && useSiteRule && optimizeHtml;

	const proxyUrl = proxyUrlConstructor({
		endpoint: ServerAPIEndpoint.PROCESS_HTML,
		payload: {
			stripCspMetaTag_bwsvr8911: bypassCsp,
			zz_url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxy: proxySettings,
	});
	const proxyDomain = getUrlSchemaHost(proxySettings.host);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: proxyUrl,
							},
							type: "redirect",
						},
						condition: {
							excludedRequestDomains: [proxyDomain],
							initiatorDomains: [host],
							regexFilter: URL_REGEX,
							resourceTypes: ["main_frame", "sub_frame"],
						},
						id: optimizeHtmlId,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [optimizeHtmlId],
	});
}
