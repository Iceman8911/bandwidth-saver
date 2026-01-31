import {
	customProxyUrlConstructor,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import { browser } from "wxt/browser";
import {
	CompressionMode,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type { DnrRuleModifierCallbackPayload } from "@/utils/dnr-rules";
import { getUrlSchemaHost } from "@/utils/url";
import { DECLARATIVE_NET_REQUEST_COMPRESSION_REGEX_FLAG } from "./shared";

const { PROXY: PROXY_MODE } = CompressionMode;

const IMAGE_URL_REGEX = `^(?:${DECLARATIVE_NET_REQUEST_COMPRESSION_REGEX_FLAG})?(https?://.+)`;

export async function applyDefaultProxyCompressionRules(
	payload: DnrRuleModifierCallbackPayload,
): Promise<void> {
	const {
		default: {
			compression: { format, preserveAnim, mode, quality },
			general: { compression, enabled },
			proxy: proxySettings,
		},
		site: {
			priorityDomains: { all: excludedDomains },
		},
	} = payload;

	const isEnabled = enabled && compression && mode === PROXY_MODE;

	if (!isEnabled) {
		return browser.declarativeNetRequest.updateSessionRules({
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
			],
		});
	}

	const proxyUrl = customProxyUrlConstructor(
		{
			format_bwsvr8911: format,
			preserveAnim_bwsvr8911: preserveAnim,
			quality_bwsvr8911: quality,
			url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxySettings,
	);

	const proxyDomain = getUrlSchemaHost(proxySettings.host);

	return browser.declarativeNetRequest.updateSessionRules({
		addRules: [
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
					regexFilter: IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
				// Set to high to override some static rules
				priority: DeclarativeNetRequestPriority.HIGH,
			},
		],
		removeRuleIds: [DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY],
	});
}

export async function applySiteProxyCompressionRules({
	site: { originData },
}: DnrRuleModifierCallbackPayload): Promise<void> {
	const promises = originData.entries().map(
		async ([
			host,
			{
				data: {
					compression: { format, preserveAnim, quality, mode },
					general: { compression, enabled, useSiteRule },
					proxy: proxySettings,
				},
				ids: {
					compression: { proxy: proxyCompressionId },
				},
			},
		]) => {
			const isEnabled =
				enabled && compression && useSiteRule && mode === PROXY_MODE;

			if (!isEnabled) {
				return browser.declarativeNetRequest.updateSessionRules({
					removeRuleIds: [proxyCompressionId],
				});
			}

			const proxyUrl = customProxyUrlConstructor(
				{
					format_bwsvr8911: format,
					preserveAnim_bwsvr8911: preserveAnim,
					quality_bwsvr8911: quality,
					url_bwsvr8911: "\\0" as UrlSchema,
				},
				proxySettings,
			);

			const proxyDomain = getUrlSchemaHost(proxySettings.host);

			return browser.declarativeNetRequest.updateSessionRules({
				addRules: [
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
							regexFilter: IMAGE_URL_REGEX,
							resourceTypes: ["image"],
						},
						id: proxyCompressionId,
						// Set to high to override some static rules
						priority: DeclarativeNetRequestPriority.HIGH,
					},
				],
				removeRuleIds: [proxyCompressionId],
			});
		},
	);

	await Promise.all(promises);
}

export async function refreshProxyCompressionDnrRules(
	payload: DnrRuleModifierCallbackPayload,
): Promise<void> {
	await applyDefaultProxyCompressionRules(payload);
	await applySiteProxyCompressionRules(payload);
}
