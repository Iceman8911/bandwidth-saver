import type { UrlOutput } from "@bandwidth-saver/shared";
import type { ReadonlyDeep } from "type-fest";
import type { GeneralSettingsOutput } from "@/models/storage";

export type ContentScriptSettingsApplyCallback = (arg: {
	ele: Readonly<HTMLElement>;
	applySetting: boolean;
}) => void;

export type ContentScriptTogglerPayload = ReadonlyDeep<{
	origin: UrlOutput;
	settings: {
		default: GeneralSettingsOutput;
		site: GeneralSettingsOutput;
	};
}>;
