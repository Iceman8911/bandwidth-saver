import type { UrlSchema } from "@bandwidth-saver/shared";
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
import { getUrlSchemaHost } from "./url";

/**
 * Applies site-specific declarative net request rules to all sites with custom settings.
 *
 * @param ruleCb - Function that generates the rule for a given site URL
 */
export async function applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites(
	ruleCb: (
		url: UrlSchema,
	) => Promise<Browser.declarativeNetRequest.UpdateRuleOptions>,
): Promise<void> {
	const ruleUpdatesToApply: Browser.declarativeNetRequest.UpdateRuleOptions = {
		addRules: [],
		removeRuleIds: [],
	};

	for (const url of await getSiteUrlOrigins()) {
		const { addRules = [], removeRuleIds = [] } = await ruleCb(url);

		ruleUpdatesToApply.addRules?.push(...addRules);
		ruleUpdatesToApply.removeRuleIds?.push(...removeRuleIds);
	}

	await browser.declarativeNetRequest.updateSessionRules(ruleUpdatesToApply);
}

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
		const { ruleIdOffset } =
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
};

export async function getSiteDomainsWithPriorityRules(): Promise<SiteDomainsWithPriorityRules> {
	const domains: SiteDomainsWithPriorityRules = { active: [], disabled: [] };

	for (const url of await getSiteUrlOrigins()) {
		const { ruleIdOffset, enabled } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		if (!enabled) domains.disabled.push(getUrlSchemaHost(url));
		else if (ruleIdOffset != null) {
			domains.active.push(getUrlSchemaHost(url));
		}
	}

	return domains;
}

export async function getAvailableSiteRuleIdOffset(): Promise<number | null> {
	const usedRuleIdOffsetPromises: Promise<number | null>[] = [];

	for (const url of await getSiteUrlOrigins()) {
		usedRuleIdOffsetPromises.push(
			getSiteSpecificGeneralSettingsStorageItem(url)
				.getValue()
				.then(({ ruleIdOffset }) => ruleIdOffset),
		);
	}

	const excluded = new Set(await Promise.all(usedRuleIdOffsetPromises));
	for (
		let i = 0;
		i < DeclarativeNetRequestRuleIds._DECLARATIVE_NET_REQUEST_RULE_ID_RANGE;
		i++
	) {
		if (!excluded.has(i)) {
			return i;
		}
	}

	return null;
}

interface DnrSettingsDataPayload {
	general: GeneralSettingsSchema;
	compression: CompressionSettingsSchema;
	proxy: ProxySettingsSchema;
}

interface DnrCallbackPayload {
	default: DnrSettingsDataPayload;
	site: {
		/** all the available site origins and their data */
		originData: Map<UrlSchema, DnrSettingsDataPayload>;

		/** Solely for default dnr functions to exclude sites */
		priorityDomains: SiteDomainsWithPriorityRules;
	};
}

type DnrCallback = (payload: DnrCallbackPayload) => Promise<void>;

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
				origins
					.keys()
					.map(async (origin) => {
						const [generalSettings, compressionSettings, proxySettings] =
							await Promise.all([
								getSiteSpecificGeneralSettingsStorageItem(origin).getValue(),
								getSiteSpecificCompressionSettingsStorageItem(
									origin,
								).getValue(),
								getSiteSpecificProxySettingsStorageItem(origin).getValue(),
							]);

						const payload: DnrSettingsDataPayload = {
							compression: compressionSettings,
							general: generalSettings,
							proxy: proxySettings,
						};

						return [origin, payload] as const;
					})
					.toArray(),
			)
			.then((arrayOfPromises) => Promise.all(arrayOfPromises)),
		getSiteDomainsWithPriorityRules(),
	]);

	const siteOriginSettingsMap: DnrCallbackPayload["site"]["originData"] =
		new Map(siteOriginSettingsArray);

	const payload: DnrCallbackPayload = {
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

	for (const cb of cbs) {
		await cb(payload);
	}
}

export function runDnrRuleModifiersOnStorageChange(
	...cbs: ReadonlyArray<DnrCallback>
) {
	const listener = (changes: Record<string, Browser.storage.StorageChange>) =>
		onChangedListener(changes, ...cbs);

	// `local` since no relevant settings are synced or session-scoped
	localOnChanged.addListener(listener);

	return () => localOnChanged.removeListener(listener);
}
