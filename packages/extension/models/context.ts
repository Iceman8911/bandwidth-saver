import * as v from "valibot";

/** Whether or not the displayed / accesible settings apply globally or are scoped to the currently opened website */
export const SettingsScope = v.picklist(["domain", "global"]);
export type SettingsScope = v.InferOutput<typeof SettingsScope>;
