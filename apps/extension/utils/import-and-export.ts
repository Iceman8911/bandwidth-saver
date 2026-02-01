import * as v from "valibot";
import { storage } from "wxt/utils/storage";
import { SettingsExportDataSchema } from "@/models/import-and-export";
import { StorageKey } from "@/shared/constants";
import {
	defaultCompressionSettingsStorageItem,
	defaultGeneralSettingsStorageItem,
	defaultProxySettingsStorageItem,
	getSiteSpecificCompressionSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
	getSiteSpecificProxySettingsStorageItem,
	getSiteSpecificStatisticsStorageItem,
	schemaVersionStorageItem,
	siteUrlOriginsStorageItem,
	statisticsStorageItem,
} from "@/shared/storage";

const {
	DEFAULT_SETTINGS_COMPRESSION,
	DEFAULT_SETTINGS_GENERAL,
	DEFAULT_SETTINGS_PROXY,
	SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX,
	SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX,
	SITE_SPECIFIC_SETTINGS_PROXY_PREFIX,
	SITE_URL_ORIGINS,
	SCHEMA_VERSION,
	SITE_SPECIFIC_STATISTICS_PREFIX,
	STATISTICS,
} = StorageKey;

async function exportExtensionSettings(): Promise<SettingsExportDataSchema> {
	const [
		defaultGeneralSettings,
		defaultCompressionSettings,
		defaultProxySettings,
		schemaVersion,
		siteUrlOrigins,
		generalStatistics,
	] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		defaultCompressionSettingsStorageItem.getValue(),
		defaultProxySettingsStorageItem.getValue(),
		schemaVersionStorageItem.getValue(),
		siteUrlOriginsStorageItem.getValue(),
		statisticsStorageItem.getValue(),
	]);

	const exported: SettingsExportDataSchema = {
		[DEFAULT_SETTINGS_GENERAL]: defaultGeneralSettings,
		[DEFAULT_SETTINGS_COMPRESSION]: defaultCompressionSettings,
		[DEFAULT_SETTINGS_PROXY]: defaultProxySettings,
		[SITE_URL_ORIGINS]: siteUrlOrigins,
		[SCHEMA_VERSION]: schemaVersion,
		[STATISTICS]: generalStatistics,
		site: { compression: {}, general: {}, proxy: {}, statistics: {} },
	};

	const sitePromises = siteUrlOrigins.map(async (origin) => {
		const [general, compression, proxy, statistics] = await Promise.all([
			getSiteSpecificGeneralSettingsStorageItem(origin).getValue(),
			getSiteSpecificCompressionSettingsStorageItem(origin).getValue(),
			getSiteSpecificProxySettingsStorageItem(origin).getValue(),
			getSiteSpecificStatisticsStorageItem(origin).getValue(),
		]);

		exported.site.general[`${SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX}${origin}`] =
			general;
		exported.site.compression[
			`${SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX}${origin}`
		] = compression;
		exported.site.proxy[`${SITE_SPECIFIC_SETTINGS_PROXY_PREFIX}${origin}`] =
			proxy;
		exported.site.statistics[`${SITE_SPECIFIC_STATISTICS_PREFIX}${origin}`] =
			statistics;
	});

	await Promise.all(sitePromises);

	return exported;
}

export async function exportExtensionSettingsAsString(): Promise<string> {
	return JSON.stringify(await exportExtensionSettings());
}

/** Returns true or false depending on whether the import was succesful or not */
async function importExtensionSettings(
	settings: SettingsExportDataSchema,
): Promise<boolean> {
	try {
		const promises: Promise<void>[] = [];

		let settingsKey: keyof SettingsExportDataSchema;

		for (settingsKey in settings) {
			switch (settingsKey) {
				case DEFAULT_SETTINGS_COMPRESSION:
				case DEFAULT_SETTINGS_GENERAL:
				case DEFAULT_SETTINGS_PROXY:
				case SCHEMA_VERSION:
				case SITE_URL_ORIGINS:
				case STATISTICS:
					promises.push(storage.setItem(settingsKey, settings[settingsKey]));
					break;

				case "site": {
					const val = settings[settingsKey];

					const { compression, general, proxy, statistics } = val;

					let compressionKey: keyof typeof compression;

					for (compressionKey in compression) {
						promises.push(
							storage.setItem(compressionKey, compression[compressionKey]),
						);
					}

					let generalKey: keyof typeof general;

					for (generalKey in general) {
						promises.push(storage.setItem(generalKey, general[generalKey]));
					}

					let proxyKey: keyof typeof proxy;

					for (proxyKey in proxy) {
						promises.push(storage.setItem(proxyKey, proxy[proxyKey]));
					}

					let statisticsKey: keyof typeof statistics;

					for (statisticsKey in statistics) {
						promises.push(
							storage.setItem(statisticsKey, statistics[statisticsKey]),
						);
					}

					break;
				}
				default:
					throw Error(
						`You didn't account for key: ${settingsKey} in the export data`,
					);
			}
		}

		await Promise.all(promises);

		return true;
	} catch (e) {
		console.error(
			"Import from data failed with error:",
			e,
			"on data:",
			JSON.stringify(settings, null, 2),
		);
		return false;
	}
}

/** Returns true or false depending on whether the import was succesful or not */
export async function importExtensionSettingsFromString(
	src: string,
): Promise<boolean> {
	try {
		const settings = v.parse(SettingsExportDataSchema, JSON.parse(src));

		return await importExtensionSettings(settings);
	} catch (e) {
		console.error(
			`Import from string failed with error: ${e} on string: ${src}`,
		);

		return false;
	}
}
