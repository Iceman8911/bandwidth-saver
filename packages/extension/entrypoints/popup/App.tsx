import { getRandomUUID } from "@bandwidth-saver/shared";
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
import { ACTIVE_TAB_URL } from "@/shared/constants";

const activeTabUrl = await ACTIVE_TAB_URL();

const [scope, setScope] = createSignal<SettingsScope>("domain");

function PopupSettings() {
	const accordionName = getRandomUUID();

	return (
		<div class="join join-vertical bg-base-100">
			<PopupCompressionSettings
				name={accordionName}
				scope={scope()}
				tabUrl={activeTabUrl}
			/>

			<PopupBlockSettings
				name={accordionName}
				scope={scope()}
				tabUrl={activeTabUrl}
			/>

			<PopupProxySettings
				name={accordionName}
				scope={scope()}
				tabUrl={activeTabUrl}
			/>

			<PopupOtherSettings
				name={accordionName}
				scope={scope()}
				tabUrl={activeTabUrl}
			/>
		</div>
	);
}

export default function App() {
	return (
		<div class="h-fit w-96 divide-y divide-base-300 *:w-full *:p-4">
			<PopupHeader scope={scope()} setScope={setScope} />

			<PopupStatistics scope={scope()} tabUrl={activeTabUrl} />

			<PopupToggles scope={scope()} tabUrl={activeTabUrl} />

			<PopupSettings />

			<PopupFooter />
		</div>
	);
}
