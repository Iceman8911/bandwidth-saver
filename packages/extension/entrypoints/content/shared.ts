export type ContentScriptSettingsApplyCallback = (arg: {
	ele: Readonly<HTMLElement>;
	applySetting: boolean;
}) => void;
