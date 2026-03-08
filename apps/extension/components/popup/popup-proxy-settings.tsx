import { UrlSchema } from "@bandwidth-saver/shared";
import { isEqual } from "@ver0/deep-equal";
import { Save } from "lucide-solid";
import { createEffect, createMemo, Show, useContext } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createStore, produce } from "solid-js/store";
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

function ProxyMainEndpointInput(props: TempProxySettingsProps) {
	return (
		<>
			<label
				class="flex items-center justify-between"
				for="proxy-main-endpoint"
			>
				<div>
					Main Endpoint: <span class="text-error">*</span>
				</div>

				<InformativeTooltip
					dir="bottom"
					tip={
						<div class="max-w-3xs space-y-2 text-xs">
							<p>
								The origin of the main external proxy, without the ending slash
								(/).
							</p>
							<p>
								E.g{" "}
								<span class="text-info">
									https://bandwidth-saver.wuchijss2.workers.dev
								</span>
								,{" "}
								<span class="text-info">
									https://bandwidth-saver.onrender.com
								</span>
							</p>
						</div>
					}
				/>
			</label>

			<input
				class="input"
				id="proxy-main-endpoint"
				onBlur={(e) =>
					props.set(
						produce((s) => {
							s.endpoint.main = v.parse(UrlSchema, e.target.value);
						}),
					)
				}
				required
				type="text"
				value={props.store.endpoint.main}
			/>
		</>
	);
}

function ProxyBackupEndpointsInput(props: TempProxySettingsProps) {
	return (
		<>
			<label
				class="flex items-center justify-between"
				for="proxy-backup-endpoints"
			>
				<div>Backup Endpoints:</div>

				<InformativeTooltip
					dir="bottom"
					tip={
						<div class="max-w-3xs space-y-2 text-xs">
							<p>
								Backup origins of other external proxies, without the ending
								slash (/). Assuming the main one has issues, these will be used
								to compensate.
							</p>
							<p class="text-warning">Comma seperated</p>
						</div>
					}
				/>
			</label>

			<input
				class="input"
				id="proxy-backup-endpoints"
				onBlur={(e) =>
					props.set(
						produce((s) => {
							s.endpoint.backups = e.target.value
								.split(",")
								.reduce<UrlSchema[]>((arr, str) => {
									const trimmed = str.trim();

									if (v.is(UrlSchema, trimmed)) {
										arr.push(trimmed as UrlSchema);
									}

									return arr;
								}, []);
						}),
					)
				}
				type="text"
				value={props.store.endpoint.backups.join(", ")}
			/>
		</>
	);
}

function CloudinaryCloudNameInput(props: TempProxySettingsProps) {
	return (
		<>
			<label
				class="flex items-center justify-between"
				for="proxy-cloudinary-cloud-name"
			>
				<div>Cloudinary Cloud Name:</div>

				<InformativeTooltip
					dir="bottom"
					tip={
						<div class="max-w-3xs space-y-2 text-xs">
							<p>
								Optional. Only required if you wish to use cloudinary-based
								optimization (which is rather efficient). You can get a{" "}
								<a
									class="link link-info"
									href="https://cloudinary.com/users/register_free"
									rel="noopener"
									target="_blank"
								>
									free cloudinary account
								</a>{" "}
								and input the cloud name here :D.
							</p>
							<p>
								Your cloudname will be a random bunch of letters like{" "}
								<i>diyoicsa</i>.
							</p>
						</div>
					}
				/>
			</label>

			<input
				class="input"
				id="proxy-cloudinary-cloud-name"
				onInput={(e) => props.set("cloudinary", e.target.value)}
				placeholder="diyoicsa"
				type="text"
				value={props.store.cloudinary ?? ""}
			/>
		</>
	);
}

function ForceManualImageTransformationInput(props: TempProxySettingsProps) {
	return (
		<>
			<label class="flex items-center justify-between" for="proxy-force-manual">
				<div>Force Manual Transformation:</div>

				<InformativeTooltip
					dir="bottom"
					tip={
						<div class="max-w-3xs space-y-2 text-xs">
							<p>
								Whether the proxy should manually do the transformations (like
								compression), or attempt to transfer the load to other public
								endpoints.
							</p>
						</div>
					}
				/>
			</label>

			<input
				checked={props.store.forceManual}
				class="toggle"
				id="proxy-force-manual"
				onInput={(e) => props.set("forceManual", e.target.checked)}
				type="checkbox"
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
		structuredClone(proxySettings()),
	);

	// Sync external changes
	createEffect(() => setTempProxySettings(structuredClone(proxySettings())));

	const isTempProxySettingsUnchanged = createMemo(() =>
		isEqual(tempProxySettings, structuredClone(proxySettings())),
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
				<ProxyMainEndpointInput
					set={setTempProxySettings}
					store={tempProxySettings}
				/>
				<ProxyBackupEndpointsInput
					set={setTempProxySettings}
					store={tempProxySettings}
				/>
				<CloudinaryCloudNameInput
					set={setTempProxySettings}
					store={tempProxySettings}
				/>
				<ForceManualImageTransformationInput
					set={setTempProxySettings}
					store={tempProxySettings}
				/>

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
