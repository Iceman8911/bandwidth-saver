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
		const { useSiteRule: ruleIdOffset } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		if (ruleIdOffset != null) used++;
	}

	return {
		left:
			DeclarativeNetRequestRuleIds._DECLARATIVE_NET_REQUEST_RULE_ID_RANGE -
			used,
		used,
	};
}

type SiteDomainsWithPriorityRules = {
	/** All settings should be disabled on the site */
	disabled: string[];

	/** Prioritize site-scoped settings */
	active: string[];

	/** All the site domains */
	all: string[];
};

export async function getSiteDomainsWithPriorityRules(): Promise<SiteDomainsWithPriorityRules> {
	const domains: SiteDomainsWithPriorityRules = {
		active: [],
		all: [],
		disabled: [],
	};

	for (const url of await getSiteUrlOrigins()) {
		const { useSiteRule: ruleIdOffset, enabled } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		const host = getUrlSchemaHost(url);

		domains.all.push(host);

		if (!enabled) domains.disabled.push(host);
		else if (ruleIdOffset != null) {
			domains.active.push(host);
		}
	}

	return domains;
}

interface DnrSettingsDataPayload {
	general: GeneralSettingsSchema;
	compression: CompressionSettingsSchema;
	proxy: ProxySettingsSchema;
}

export interface DnrRuleModifierCallbackPayload {
	default: DnrSettingsDataPayload;
	site: {
		/** all the available site hosts and their data and dnr ids */
		originData: Map<
			string,
			{ data: DnrSettingsDataPayload; ids: DnrSiteScopeUrlIdPayload }
		>;

		/** Solely for default dnr functions to exclude sites */
		priorityDomains: SiteDomainsWithPriorityRules;
	};
}

type DnrCallback = (payload: DnrRuleModifierCallbackPayload) => Promise<void>;

/** Gets all the data needed for running the dnr rule modifier functions */
async function getDnrRuleModifierCallbackPayload(): Promise<DnrRuleModifierCallbackPayload> {
	// Get the values
	const [
		defaultGeneralSettings,
		defaultCompressionSettings,
		defaultProxySettings,
		siteOriginSettingsArray,
		sitePriorityDomains,
	] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		defaultCompressionSettingsStorageItem.getValue(),
		defaultProxySettingsStorageItem.getValue(),
		getSiteUrlOrigins()
			.then((origins) =>
				origins.keys().map(async (origin) => {
					const [generalSettings, compressionSettings, proxySettings] =
						await Promise.all([
							getSiteSpecificGeneralSettingsStorageItem(origin).getValue(),
							getSiteSpecificCompressionSettingsStorageItem(origin).getValue(),
							getSiteSpecificProxySettingsStorageItem(origin).getValue(),
						]);

					const payload: DnrSettingsDataPayload = {
						compression: compressionSettings,
						general: generalSettings,
						proxy: proxySettings,
					};

					return [
						getUrlSchemaHost(origin),
						{ data: payload, ids: getUrlIdsFromOrigin(origin) },
					] as const;
				}),
			)
			.then((iterableOfPromises) => Promise.all(iterableOfPromises)),
		getSiteDomainsWithPriorityRules(),
	]);

	const siteOriginSettingsMap: DnrRuleModifierCallbackPayload["site"]["originData"] =
		new Map(siteOriginSettingsArray);

	const payload: DnrRuleModifierCallbackPayload = {
		default: {
			compression: defaultCompressionSettings,
			general: defaultGeneralSettings,
			proxy: defaultProxySettings,
		},
		site: {
			originData: siteOriginSettingsMap,
			priorityDomains: sitePriorityDomains,
		},
	};

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

	const payload = await getDnrRuleModifierCallbackPayload();

	await Promise.all(cbs.map((cb) => cb(payload)));
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
