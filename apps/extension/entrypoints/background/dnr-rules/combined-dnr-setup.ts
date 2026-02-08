import {
	type DefaultDnrRuleModifierPayload,
	getDefaultDnrRuleModifierPayload,
	getSiteScopedDnrRuleModifierPayload,
	runDnrRuleModifiersOnStorageChange,
	type SiteScopedDnrRuleModifierPayload,
} from "@/utils/dnr-rules";
import {
	applyDefaultBlockRules,
	applySiteScopedBlockRules,
} from "./block-assets";
import {
	applyDefaultCacheHtmlBetterRules,
	applySiteScopedCacheHtmlBetterRules,
} from "./cache-html-better";
import {
	applyDefaultProxyCompressionRules,
	applySiteScopedProxyCompressionRules,
} from "./compression/proxy-mode";
import {
	applyDefaultSimpleCompressionRules,
	applySiteScopedSimpleCompressionRules,
} from "./compression/simple-mode";
import {
	applyDefaultCspRules,
	applySiteScopedCspRules,
} from "./csp-workaround";
import {
	applyDefaultSaveDataRules,
	applySiteScopedSaveDataRules,
} from "./save-data";

async function applyDefaultDnrRules(
	defaultPayload: DefaultDnrRuleModifierPayload,
) {
	await Promise.all([
		applyDefaultSaveDataRules(defaultPayload),
		applyDefaultCspRules(defaultPayload),
		applyDefaultBlockRules(defaultPayload),
		applyDefaultSimpleCompressionRules(defaultPayload),
		applyDefaultProxyCompressionRules(defaultPayload),
		applyDefaultCacheHtmlBetterRules(defaultPayload),
	]);
}

async function applySiteScopedDnrRules(
	siteScopedPayload: SiteScopedDnrRuleModifierPayload,
) {
	await Promise.all(
		siteScopedPayload
			.entries()
			.map((entry) =>
				Promise.all([
					applySiteScopedSaveDataRules(entry),
					applySiteScopedCspRules(entry),
					applySiteScopedBlockRules(entry),
					applySiteScopedProxyCompressionRules(entry),
					applySiteScopedSimpleCompressionRules(entry),
					applySiteScopedCacheHtmlBetterRules(entry),
				]),
			),
	);
}

export async function setupDnrRulesAndRefreshing() {
	const [defaultPayload, siteScopedPayload] = await Promise.all([
		getDefaultDnrRuleModifierPayload(),
		getSiteScopedDnrRuleModifierPayload(),
	]);

	// Set the rules on startup
	await Promise.all([
		applyDefaultDnrRules(defaultPayload),

		applySiteScopedDnrRules(siteScopedPayload),
	]);

	// Refresh the rules anytime the storage changes
	runDnrRuleModifiersOnStorageChange(
		([defaultPayload]) => applyDefaultDnrRules(defaultPayload),

		([_, siteScopedPayload]) => applySiteScopedDnrRules(siteScopedPayload),
	);
}
