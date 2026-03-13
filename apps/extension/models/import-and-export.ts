import { type UrlOutput, UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { StorageKey } from "@/shared/constants";
import {
	type CompressionSettingsOutput,
	CompressionSettingsSchema,
	type GeneralSettingsOutput,
	GeneralSettingsSchema,
	type ProxySettingsOutput,
	ProxySettingsSchema,
	type SchemaVersionOutput,
	SchemaVersionSchema,
	type SiteUrlOriginsOutput,
	SiteUrlOriginsSchema,
} from "./storage";

const {
	DEFAULT_SETTINGS_COMPRESSION,
	DEFAULT_SETTINGS_GENERAL,
	DEFAULT_SETTINGS_PROXY,
	SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX,
	SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX,
	SITE_SPECIFIC_SETTINGS_PROXY_PREFIX,
	SITE_URL_ORIGINS,
	SCHEMA_VERSION,
} = StorageKey;

const DefaultGeneralSettingsSchema = v.object({
	[DEFAULT_SETTINGS_GENERAL]: GeneralSettingsSchema,
});
const DefaultCompressionSettingsSchema = v.object({
	[DEFAULT_SETTINGS_COMPRESSION]: CompressionSettingsSchema,
});
const DefaultProxySettingsSchema = v.object({
	[DEFAULT_SETTINGS_PROXY]: ProxySettingsSchema,
});

const pipeCheckToString = <TStringType extends string = string>(
	checker: (input: string) => boolean,
) =>
	v.pipe(
		v.string(),
		v.check(checker),
		//@ts-expect-error Valibot transform can't express the refined string template type here
		v.transform((input) => input as TStringType),
	);

const SiteScopedGeneralSettingsSchema = v.record(
	pipeCheckToString<`${typeof SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX}${UrlOutput}`>(
		(input) => {
			const [_, possibleSiteOrigin] = input.split(
				SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX,
			);

			return v.is(UrlSchema, possibleSiteOrigin);
		},
	),
	GeneralSettingsSchema,
);

const SiteScopedCompressionSettingsSchema = v.record(
	pipeCheckToString<`${typeof SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX}${UrlOutput}`>(
		(input) => {
			const [_, possibleSiteOrigin] = input.split(
				SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX,
			);

			return v.is(UrlSchema, possibleSiteOrigin);
		},
	),
	CompressionSettingsSchema,
);

const SiteScopedProxySettingsSchema = v.record(
	pipeCheckToString<`${typeof SITE_SPECIFIC_SETTINGS_PROXY_PREFIX}${UrlOutput}`>(
		(input) => {
			const [_, possibleSiteOrigin] = input.split(
				SITE_SPECIFIC_SETTINGS_PROXY_PREFIX,
			);

			return v.is(UrlSchema, possibleSiteOrigin);
		},
	),
	ProxySettingsSchema,
);

const GeneralSiteUrlOriginsSchema = v.object({
	[SITE_URL_ORIGINS]: SiteUrlOriginsSchema,
});

const GeneralSchemaVersionSchema = v.object({
	[SCHEMA_VERSION]: SchemaVersionSchema,
});

export const SettingsExportDataSchema = v.object({
	...GeneralSchemaVersionSchema.entries,
	...GeneralSiteUrlOriginsSchema.entries,

	...DefaultGeneralSettingsSchema.entries,
	...DefaultCompressionSettingsSchema.entries,
	...DefaultProxySettingsSchema.entries,

	site: v.object({
		compression: SiteScopedCompressionSettingsSchema,
		general: SiteScopedGeneralSettingsSchema,
		proxy: SiteScopedProxySettingsSchema,
	}),
});
export type SettingsExportDataOutput = v.InferOutput<
	typeof SettingsExportDataSchema
>;

export type SettingsExportDataInput = v.InferInput<
	typeof SettingsExportDataSchema
>;

export type DefaultSettingsGeneralKey = typeof DEFAULT_SETTINGS_GENERAL;
export type DefaultSettingsCompressionKey = typeof DEFAULT_SETTINGS_COMPRESSION;
export type DefaultSettingsProxyKey = typeof DEFAULT_SETTINGS_PROXY;

export type SiteSpecificSettingsGeneralKey =
	`${typeof SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX}${UrlOutput}`;
export type SiteSpecificSettingsCompressionKey =
	`${typeof SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX}${UrlOutput}`;
export type SiteSpecificSettingsProxyKey =
	`${typeof SITE_SPECIFIC_SETTINGS_PROXY_PREFIX}${UrlOutput}`;

export type SettingsExportDataShape = Readonly<{
	[DEFAULT_SETTINGS_GENERAL]: GeneralSettingsOutput;
	[DEFAULT_SETTINGS_COMPRESSION]: CompressionSettingsOutput;
	[DEFAULT_SETTINGS_PROXY]: ProxySettingsOutput;
	[SITE_URL_ORIGINS]: SiteUrlOriginsOutput;
	[SCHEMA_VERSION]: SchemaVersionOutput;
	site: Readonly<{
		compression: Record<
			SiteSpecificSettingsCompressionKey,
			CompressionSettingsOutput
		>;
		general: Record<SiteSpecificSettingsGeneralKey, GeneralSettingsOutput>;
		proxy: Record<SiteSpecificSettingsProxyKey, ProxySettingsOutput>;
	}>;
}>;
