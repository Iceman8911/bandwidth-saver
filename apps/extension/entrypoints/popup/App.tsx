import type { UrlSchema } from "@bandwidth-saver/shared";
import { createAsync } from "@solidjs/router";
import { createEffect, createMemo } from "solid-js";
import { produce } from "solid-js/store";
import { PopupContext } from "@/components/popup/context";
import PopupFooterContent from "@/components/popup/popup-footer-content";
import PopupHeaderScopeButtons from "@/components/popup/popup-header-scope-buttons";
import PopupModeToggleButton from "@/components/popup/popup-mode-toggle-button";
import PopupSettingsTabsContent from "@/components/popup/popup-setting-tabs-content";
import PopupStatisticsSummary from "@/components/popup/popup-statistics-summary";
import { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import { DUMMY_TAB_URL } from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { getActiveTabUrl } from "@/utils/tabs";

export default function App() {
	const activeTabUrl = createAsync(
		async () => (await getActiveTabUrl()).origin as UrlSchema,
		{
			initialValue: DUMMY_TAB_URL,
		},
	);

	const [context, setContext] = PopupContext.defaultValue;

	const generalSettingsStorageItem = createMemo(() => {
		if (context.scope === "default") return defaultGeneralSettingsStorageItem;

		return getSiteSpecificGeneralSettingsStorageItem(context.tabOrigin);
	});

	const generalSettingsStorageItemValue = convertStorageItemToReactiveSignal(
		generalSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	createEffect(() =>
		setContext(
			produce((state) => {
				state.tabOrigin = activeTabUrl();
				state.generalSettings = {
					item: generalSettingsStorageItem(),
					val: generalSettingsStorageItemValue(),
				};

				return state;
			}),
		),
	);

	return (
		<div class="aspect-2/3 w-100 p-4">
			<PopupContext.Provider value={[context, setContext]}>
				<div class="grid size-full grid-rows-[3rem_1fr_1.15fr_50%_3.5rem] gap-3">
					<PopupHeaderScopeButtons />

					<div class="flex items-center justify-around">
						<PopupModeToggleButton />

						<h1 class="max-w-36 text-center font-semibold text-base text-primary">
							Bandwidth Saver & Monitor
						</h1>
					</div>

					<PopupStatisticsSummary />

					<PopupSettingsTabsContent />

					<PopupFooterContent />
				</div>
			</PopupContext.Provider>
		</div>
	);
}
