import { getRandomUUID, type UrlSchema } from "@bandwidth-saver/shared";
import { createAsync } from "@solidjs/router";
import { createSignal } from "solid-js";
import { PopupBlockSettings } from "@/components/popup/block-settings";
import { PopupCompressionSettings } from "@/components/popup/compression-settings";
import { PopupFooter } from "@/components/popup/footer";
import { PopupHeader } from "@/components/popup/header";
import { PopupOtherSettings } from "@/components/popup/other-settings";
import { PopupProxySettings } from "@/components/popup/proxy-settings";
import { PopupStatistics } from "@/components/popup/statistics";
import { PopupToggles } from "@/components/popup/toggle";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import { DUMMY_TAB_URL, getActiveTabUrl } from "@/shared/constants";
import { getSiteSpecificGeneralSettingsStorageItem } from "@/shared/storage";

function PopupSettings(props: { scope: SettingsScope; tabUrl: UrlSchema }) {
	const accordionName = getRandomUUID();

	return (
		<div class="join join-vertical bg-base-100">
			<PopupCompressionSettings
				name={accordionName}
				scope={props.scope}
				tabUrl={props.tabUrl}
			/>

			<PopupBlockSettings
				name={accordionName}
				scope={props.scope}
				tabUrl={props.tabUrl}
			/>

			<PopupProxySettings
				name={accordionName}
				scope={props.scope}
				tabUrl={props.tabUrl}
			/>

			<PopupOtherSettings
				name={accordionName}
				scope={props.scope}
				tabUrl={props.tabUrl}
			/>

			{/*<Show when={siteSpecificGeneralSettings().useDefaultRules}>
				<div class="absolute z-10 size-full bg-black opacity-25"></div>
			</Show>*/}
		</div>
	);
}

export default function App() {
	const activeTabUrl = createAsync(getActiveTabUrl, {
		initialValue: DUMMY_TAB_URL,
	});

	const [scope, setScope] = createSignal<SettingsScope>("site");

	const siteSpecificGeneralSettings = convertStorageItemToReactiveSignal(
		() => getSiteSpecificGeneralSettingsStorageItem(activeTabUrl()),
		DEFAULT_GENERAL_SETTINGS,
	);

	return (
		<div class="h-fit w-96 divide-y divide-base-300 *:w-full *:p-4">
			<PopupHeader scope={scope()} setScope={setScope} />

			<PopupStatistics scope={scope()} tabUrl={activeTabUrl()} />

			<PopupToggles scope={scope()} tabUrl={activeTabUrl()} />

			<Show
				when={
					!siteSpecificGeneralSettings().useDefaultRules ||
					scope() === "default"
				}
			>
				<PopupSettings scope={scope()} tabUrl={activeTabUrl()} />
			</Show>

			<PopupFooter />
		</div>
	);
}
