import { isEqual } from "@ver0/deep-equal";
import { Save } from "lucide-solid";
import { createEffect, createMemo, Show, useContext } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createStore } from "solid-js/store";
import * as v from "valibot";
import { DEFAULT_PROXY_SETTINGS, ProxySettingsSchema } from "@/models/storage";
import {
	defaultProxySettingsStorageItem,
	getSiteSpecificProxySettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { BaseButton } from "../button";
import { InformativeTooltip } from "../tooltip";
import { PopupContext } from "./context";

type TempProxySettingsProps = {
	store: ProxySettingsSchema;
	set: SetStoreFunction<ProxySettingsSchema>;
};

function ProxyHostInput(props: TempProxySettingsProps) {
	return (
		<>
			<label class="flex items-center justify-between" for="proxy-host">
				<div>
					Host: <span class="text-error">*</span>
				</div>

				<InformativeTooltip
					tip={
						<>
							<p>
								The host / domain of the external proxy, without the protocol.
							</p>
							<p>
								E.g{" "}
								<span class="text-info">saver-of-bandwidth.onrender.org</span>
							</p>
						</>
					}
				/>
			</label>

			<input
				class="input"
				id="proxy-host"
				onInput={(e) => props.set("host", e.target.value)}
				placeholder="localhost"
				required
				type="text"
				value={props.store.host}
			/>
		</>
	);
}

function ProxyPortInput(props: TempProxySettingsProps) {
	return (
		<>
			<label class="flex items-center justify-between" for="proxy-port">
				<div>Port:</div>

				<InformativeTooltip tip="Optional if you aren't using a `localhost`" />
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

		const parsedProxySettings = v.parse(ProxySettingsSchema, tempProxySettings);

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
					: generalSettings().val.useSiteRule
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
