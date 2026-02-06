import { ServerAPIEndpoint, type UrlSchema } from "@bandwidth-saver/shared";
import { browser } from "wxt/browser";
import {
	CompressionMode,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type {
	DefaultDnrRuleModifierPayload,
	SiteScopedDnrRuleModifierPayloadEntry,
} from "@/utils/dnr-rules";
import { getUrlSchemaHost } from "@/utils/url";
import { proxyUrlConstructor } from "../shared";

const { PROXY: PROXY_MODE } = CompressionMode;

const IMAGE_URL_REGEX = `^(https?://.+)`;

export async function applyDefaultProxyCompressionRules(
	payload: DefaultDnrRuleModifierPayload,
): Promise<void> {
	const {
		compression: { format, preserveAnim, mode, quality },
		general: { compression, enabled },
		proxy: proxySettings,
		excludedDomains,
	} = payload;

	const isEnabled = enabled && compression && mode === PROXY_MODE;

	if (!isEnabled) {
		return browser.declarativeNetRequest.updateSessionRules({
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.DEFAULT_COMPRESSION_MODE_PROXY,
			],
		});
	}

	const proxyUrl = proxyUrlConstructor({
		endpoint: ServerAPIEndpoint.PROCESS_IMAGE,
		payload: {
			cloudinary_bwsvr8911: proxySettings.cloudinary,
			format_bwsvr8911: format,
			preserveAnim_bwsvr8911: preserveAnim,
			quality_bwsvr8911: quality,
			zz_url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxy: proxySettings,
	});

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
				id: DeclarativeNetRequestRuleIds.DEFAULT_COMPRESSION_MODE_PROXY,
				// Set to high to override some static rules
				priority: DeclarativeNetRequestPriority.HIGH,
			},
		],
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.DEFAULT_COMPRESSION_MODE_PROXY,
		],
	});
}

export async function applySiteScopedProxyCompressionRules([
	host,
	{
		compression: { format, preserveAnim, quality, mode },
		general: { compression, enabled, useSiteRule },
		proxy: proxySettings,
		ids: {
			compression: { proxy: proxyCompressionId },
		},
	},
]: SiteScopedDnrRuleModifierPayloadEntry): Promise<void> {
	const isEnabled =
		enabled && compression && useSiteRule && mode === PROXY_MODE;

	if (!isEnabled) {
		return browser.declarativeNetRequest.updateSessionRules({
			removeRuleIds: [proxyCompressionId],
		});
	}

	const proxyUrl = proxyUrlConstructor({
		endpoint: ServerAPIEndpoint.PROCESS_IMAGE,
		payload: {
			cloudinary_bwsvr8911: proxySettings.cloudinary,
			format_bwsvr8911: format,
			preserveAnim_bwsvr8911: preserveAnim,
			quality_bwsvr8911: quality,
			zz_url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxy: proxySettings,
	});

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
}
