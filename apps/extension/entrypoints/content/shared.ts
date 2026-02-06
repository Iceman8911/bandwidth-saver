import type { UrlSchema } from "@bandwidth-saver/shared";
import type { ReadonlyDeep } from "type-fest";
import type { GeneralSettingsSchema } from "@/models/storage";

export type ContentScriptSettingsApplyCallback = (arg: {
	ele: Readonly<HTMLElement>;
	applySetting: boolean;
}) => void;

export type ContentScriptTogglerPayload = ReadonlyDeep<{
	origin: UrlSchema;
	settings: {
		default: GeneralSettingsSchema;
		site: GeneralSettingsSchema;
	};
}>;
