import type { ReadonlyDeep } from "type-fest";
import * as v from "valibot";
import { type Browser, browser } from "wxt/browser";
import {
	CompressionSettingsSchema,
	GeneralSettingsSchema,
	ProxySettingsSchema,
} from "@/models/storage";
import { DeclarativeNetRequestRuleIds } from "@/shared/constants";
import {
	defaultCompressionSettingsStorageItem,
	defaultGeneralSettingsStorageItem,
	defaultProxySettingsStorageItem,
	getSiteSpecificCompressionSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
	getSiteSpecificProxySettingsStorageItem,
} from "@/shared/storage";
import { getSiteUrlOrigins } from "./storage";
import {
	type DnrSiteScopeUrlIdPayload,
	getUrlIdsFromOrigin,
	getUrlSchemaHost,
} from "./url";

type RuleAllocationUsage = {
	used: number;
	/** The amount of free rules left */
	left: number;
};

/**
 * Gets the current usage of site-specific rule allocations.
 * Useful for monitoring and warning when approaching rule limits.
 */
export async function getSiteSpecificRuleAllocationUsage(): Promise<RuleAllocationUsage> {
	let used = 0;

	for (const url of await getSiteUrlOrigins()) {
		const { useSiteRule } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		if (useSiteRule) used++;
	}

	return {
		left:
			DeclarativeNetRequestRuleIds._DECLARATIVE_NET_REQUEST_RULE_ID_RANGE -
			used,
		used,
	};
}

export async function getSiteDomainsWithPriorityRules(): Promise<string[]> {
	const domains: string[] = [];

	for (const url of await getSiteUrlOrigins()) {
		const { useSiteRule, enabled } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		const host = getUrlSchemaHost(url);

		if (!enabled || useSiteRule) {
			domains.push(host);
		}
	}

	return domains;
}

interface DnrSettingsDataPayload {
	general: GeneralSettingsSchema;
	compression: CompressionSettingsSchema;
	proxy: ProxySettingsSchema;
}

export type DefaultDnrRuleModifierPayload = ReadonlyDeep<
	DnrSettingsDataPayload & {
		excludedDomains: string[];
	}
>;

type _SiteScopedDnrRuleModifierPayloadValue = DnrSettingsDataPayload & {
	/** Unique DNR ids for each site */ ids: DnrSiteScopeUrlIdPayload;
};

export type SiteScopedDnrRuleModifierPayload = Map<
	string,
	_SiteScopedDnrRuleModifierPayloadValue
>;
export type SiteScopedDnrRuleModifierPayloadEntry = [
	host: string,
	_SiteScopedDnrRuleModifierPayloadValue,
];

type DnrCallback = (
	payload: [DefaultDnrRuleModifierPayload, SiteScopedDnrRuleModifierPayload],
) => Promise<unknown>;

/** Gets all the data needed for running the default dnr rule modifier functions */
export async function getDefaultDnrRuleModifierPayload(): Promise<DefaultDnrRuleModifierPayload> {
	const [
		defaultGeneralSettings,
		defaultCompressionSettings,
		defaultProxySettings,
		sitePriorityDomains,
	] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		defaultCompressionSettingsStorageItem.getValue(),
		defaultProxySettingsStorageItem.getValue(),
		getSiteDomainsWithPriorityRules(),
	]);

	const payload: DefaultDnrRuleModifierPayload = {
		compression: defaultCompressionSettings,
		excludedDomains: sitePriorityDomains,
		general: defaultGeneralSettings,
		proxy: defaultProxySettings,
	};

	return payload;
}

/** Gets all the data needed for running the site-scoped dnr rule modifier functions */
export async function getSiteScopedDnrRuleModifierPayload(): Promise<SiteScopedDnrRuleModifierPayload> {
	const siteOriginSettingsArray = await getSiteUrlOrigins()
		.then((origins) =>
			origins.keys().map(async (origin) => {
				const [generalSettings, compressionSettings, proxySettings] =
					await Promise.all([
						getSiteSpecificGeneralSettingsStorageItem(origin).getValue(),
						getSiteSpecificCompressionSettingsStorageItem(origin).getValue(),
						getSiteSpecificProxySettingsStorageItem(origin).getValue(),
					]);

				const entry: SiteScopedDnrRuleModifierPayloadEntry = [
					getUrlSchemaHost(origin),
					{
						compression: compressionSettings,
						general: generalSettings,
						ids: getUrlIdsFromOrigin(origin),
						proxy: proxySettings,
					},
				];

				return entry;
			}),
		)
		.then((iterableOfPromises) => Promise.all(iterableOfPromises));

	const payload: SiteScopedDnrRuleModifierPayload = new Map(
		siteOriginSettingsArray,
	);

	return payload;
}

const localOnChanged = browser.storage.local.onChanged;

// Using the changes, we'll see if we have to call the cbs with fresh values from storage
async function onChangedListener(
	changes: Record<string, Browser.storage.StorageChange>,
	...cbs: ReadonlyArray<DnrCallback>
): Promise<void> {
	let shouldCallCbs = false;
	for (const key in changes) {
		const newChange = changes[key]?.newValue;

		if (
			v.is(GeneralSettingsSchema, newChange) ||
			v.is(CompressionSettingsSchema, newChange) ||
			v.is(ProxySettingsSchema, newChange)
		) {
			shouldCallCbs = true;
		}
	}

	if (!shouldCallCbs) return;

	const payloads = await Promise.all([
		getDefaultDnrRuleModifierPayload(),
		getSiteScopedDnrRuleModifierPayload(),
	]);

	await Promise.all(cbs.map((cb) => cb(payloads)));
}

// TODO: make a variant purely for default rule setters
export function runDnrRuleModifiersOnStorageChange(
	...cbs: ReadonlyArray<DnrCallback>
) {
	const listener = (changes: Record<string, Browser.storage.StorageChange>) =>
		onChangedListener(changes, ...cbs);

	// `local` since no relevant settings are synced or session-scoped
	localOnChanged.addListener(listener);

	return () => localOnChanged.removeListener(listener);
}
