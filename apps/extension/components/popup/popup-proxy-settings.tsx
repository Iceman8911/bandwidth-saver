import { isEqual } from "@ver0/deep-equal";
import { Save } from "lucide-solid";
import { createMemo } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createStore } from "solid-js/store";
import * as v from "valibot";
import { DEFAULT_PROXY_SETTINGS, STORAGE_SCHEMA } from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import {
	defaultProxySettingsStorageItem,
	getSiteSpecificProxySettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { PopupContext } from "./context";

const PROXY_SCHEMA = STORAGE_SCHEMA[StorageKey.DEFAULT_SETTINGS_PROXY];
type PROXY_SCHEMA = v.InferOutput<typeof PROXY_SCHEMA>;

type TempProxySettingsProps = {
	store: PROXY_SCHEMA;
	set: SetStoreFunction<PROXY_SCHEMA>;
};

function ProxyHostInput(props: TempProxySettingsProps) {
	return (
		<>
			<label class="flex items-center" for="proxy-host">
				Host:
			</label>

			<input
				class="input"
				id="proxy-host"
				onInput={(e) => props.set("host", e.target.value)}
				placeholder="localhost"
				type="text"
				value={props.store.host}
			/>
		</>
	);
}

function ProxyPortInput(props: TempProxySettingsProps) {
	return (
		<>
			<label class="flex items-center" for="proxy-port">
				Port:
			</label>

			<input
				class="input"
				id="proxy-port"
				max={65536}
				min={0}
				onInput={(e) => props.set("port", Number(e.target.value))}
				placeholder="3001"
				type="number"
				value={props.store.port}
			/>
		</>
	);
}

export default function PopupProxySettings() {
	const [context] = useContext(PopupContext);

	const generalSettings = () => context.generalSettings;

	const proxySettingsStorageItem = createMemo(() => {
		if (context.scope === "default") return defaultProxySettingsStorageItem;

		return getSiteSpecificProxySettingsStorageItem(context.tabOrigin);
	});

	const proxySettings = convertStorageItemToReactiveSignal(
		proxySettingsStorageItem,
		DEFAULT_PROXY_SETTINGS,
	);

	const [tempProxySettings, setTempProxySettings] = createStore(
		proxySettings(),
	);

	// Sync external changes
	createEffect(() => setTempProxySettings(proxySettings()));

	const isTempProxySettingsUnchanged = createMemo(() =>
		isEqual(tempProxySettings, proxySettings()),
	);

	const handleUpdateProxySettings = (e: SubmitEvent) => {
		e.preventDefault();

		const parsedProxySettings = v.parse(PROXY_SCHEMA, tempProxySettings);

		proxySettingsStorageItem().setValue(parsedProxySettings);
	};

	return (
		<Show
			fallback={
				<div class="grid size-full place-items-center text-base">
					{context.scope === "default"
						? "Default settings are disabled."
						: "Site-scoped settings are disabled."}
					{generalSettings().val.enabled
						? " (Using the default settings instead.)"
						: ""}
				</div>
			}
			when={
				context.scope === "default"
					? generalSettings().val.enabled
					: generalSettings().val.ruleIdOffset != null
			}
		>
			<form
				class="grid auto-rows-auto grid-cols-[1.75fr_1fr] gap-4 text-sm"
				onSubmit={handleUpdateProxySettings}
			>
				<ProxyHostInput set={setTempProxySettings} store={tempProxySettings} />
				<ProxyPortInput set={setTempProxySettings} store={tempProxySettings} />

				<BaseButton
					class="btn-primary col-span-2 mt-4"
					disabled={isTempProxySettingsUnchanged()}
					type="submit"
				>
					<Save /> Save Changes
				</BaseButton>
			</form>
		</Show>
	);
}
