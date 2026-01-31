import type { UrlSchema } from "@bandwidth-saver/shared";
import { createContext } from "solid-js";
import { createStore } from "solid-js/store";
import { DEFAULT_GENERAL_SETTINGS, GeneralSettingsSchema } from "@/models/storage";
import { DUMMY_TAB_URL } from "@/shared/constants";
import { defaultGeneralSettingsStorageItem } from "@/shared/storage";

type PopupContextProps = {
	scope: "default" | "site";

	/** Tab origin for the active tab, only used for site specifc settings */
	tabOrigin: UrlSchema;

	generalSettings: {
		item: typeof defaultGeneralSettingsStorageItem;
		val: GeneralSettingsSchema
	};
};

const DEFAULT_POPUP_CONTEXT_PROPS = {
	generalSettings: {
		item: defaultGeneralSettingsStorageItem,
		val: DEFAULT_GENERAL_SETTINGS,
	},
	scope: "site",
	tabOrigin: DUMMY_TAB_URL,
} as const satisfies PopupContextProps;

export const PopupContext = createContext(
	createStore<PopupContextProps>(DEFAULT_POPUP_CONTEXT_PROPS),
);
