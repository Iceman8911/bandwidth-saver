import {
	type DefaultDnrRuleModifierPayload,
	getDefaultDnrRuleModifierPayload,
	getSiteScopedDnrRuleModifierPayload,
	runDnrRuleModifiersOnStorageChange,
	type SiteScopedDnrRuleModifierPayload,
} from "@/utils/dnr-rules";
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
import { applyDefaultSaveDataRules, applySiteSaveDataRules } from "./save-data";

async function applyDefaultDnrRules(
	defaultPayload: DefaultDnrRuleModifierPayload,
) {
	await Promise.all([
		applyDefaultSaveDataRules(defaultPayload),
		applyDefaultCspRules(defaultPayload),
		applyDefaultSimpleCompressionRules(defaultPayload),
		applyDefaultProxyCompressionRules(defaultPayload),
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
					applySiteSaveDataRules(entry),
					applySiteScopedCspRules(entry),
					applySiteScopedProxyCompressionRules(entry),
					applySiteScopedSimpleCompressionRules(entry),
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
