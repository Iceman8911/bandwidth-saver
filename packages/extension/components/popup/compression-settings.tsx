import {
	deduplicateArrayElements,
	ImageCompressorEndpoint,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import { For, Match, Switch } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import * as v from "valibot";
import { createStore } from "#imports";
import type { SettingsScope } from "@/models/context";
import {
	DEFAULT_COMPRESSION_SETTINGS,
	DEFAULT_GENERAL_SETTINGS,
	STORAGE_SCHEMA,
} from "@/models/storage";
import { CompressionMode, StorageKey } from "@/shared/constants";
import {
	defaultCompressionSettingsStorageItem,
	defaultGeneralSettingsStorageItem,
	getSiteSpecificCompressionSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { InformativeTooltip } from "../tooltip";

const COMPRESSION_SCHEMA =
	STORAGE_SCHEMA[StorageKey.DEFAULT_SETTINGS_COMPRESSION];
type COMPRESSION_SCHEMA = v.InferOutput<typeof COMPRESSION_SCHEMA>;

const COMPRESSION_FORMATS = [
	"auto",
	"avif",
	"jpg",
	"webp",
] as const satisfies COMPRESSION_SCHEMA["format"][];

type TempCompressionSettingsProps = {
	store: COMPRESSION_SCHEMA;
	set: SetStoreFunction<COMPRESSION_SCHEMA>;
};

function CompressionFormatSelect(props: TempCompressionSettingsProps) {
	return (
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Image Format</legend>
			<select
				class="select"
				onInput={(e) =>
					props.set(
						"format",
						v.parse(COMPRESSION_SCHEMA.entries.format, e.target.value),
					)
				}
			>
				<For each={COMPRESSION_FORMATS}>
					{(format) => (
						<option selected={props.store.format === format} value={format}>
							{format}
						</option>
					)}
				</For>
			</select>
		</fieldset>
	);
}

function CompressionModeTooltip(props: { mode: CompressionMode }) {
	return (
		<Switch>
			<Match when={props.mode === CompressionMode.PROXY}>
				<p>Redirects all relevant requests to the given remote proxy.</p>

				<em>
					Free from all limitations by MV3 but requires a server. If you are
					unsure what that is, don't choose this option.
				</em>
			</Match>

			<Match when={props.mode === CompressionMode.SIMPLE}>
				<p>Simple MV3 way of compressing images with DNR.</p>

				<em>
					Due to limitations in MV3, some images might be broken, and need to
					have their request domains whitelisted.
				</em>
			</Match>

			<Match when={props.mode === CompressionMode.WEB_REQUEST}>
				<p>
					(TODO) Only available in MV2, but is otherwise free from limitations
					that would require a server for feature parity.
				</p>

				<em>May affect loading speed.</em>
			</Match>
		</Switch>
	);
}

function CompressionModeSelect(props: TempCompressionSettingsProps) {
	return (
		<fieldset class="fieldset">
			<legend class="fieldset-legend">
				<span>Compression Mode</span>

				<InformativeTooltip
					dir="left"
					tip={
						<div class="w-3xs space-y-2 text-xs">
							<CompressionModeTooltip mode={props.store.mode} />
						</div>
					}
				/>
			</legend>
			<select
				class="select"
				onInput={(e) =>
					props.set(
						"mode",
						v.parse(COMPRESSION_SCHEMA.entries.mode, e.target.value),
					)
				}
			>
				<For each={Object.values(CompressionMode)}>
					{(mode) => (
						<option selected={props.store.mode === mode} value={mode}>
							<Switch>
								<Match when={mode === CompressionMode.WEB_REQUEST}>
									Web Request (MV2)
								</Match>
								<Match when={mode === CompressionMode.PROXY}>Proxy</Match>
								<Match when={mode === CompressionMode.SIMPLE}>Simple</Match>
							</Switch>
						</option>
					)}
				</For>
			</select>
		</fieldset>
	);
}

function PreferredEndpointSelect(props: TempCompressionSettingsProps) {
	return (
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Preferred Endpoint</legend>
			<select
				class="select"
				onInput={(e) =>
					props.set(
						"preferredEndpoint",
						v.parse(
							COMPRESSION_SCHEMA.entries.preferredEndpoint,
							e.target.value,
						),
					)
				}
			>
				<For
					each={deduplicateArrayElements(
						Object.values(ImageCompressorEndpoint),
					)}
				>
					{(endpoint) => (
						<option
							selected={props.store.preferredEndpoint === endpoint}
							value={endpoint}
						>
							{endpoint}
						</option>
					)}
				</For>
			</select>
		</fieldset>
	);
}

function CompressionQualityInput(props: TempCompressionSettingsProps) {
	return (
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Compression Quality</legend>
			<input
				class="input"
				max={100}
				min={0}
				onInput={(e) => props.set("quality", Number(e.target.value))}
				type="number"
				value={props.store.quality}
			/>
		</fieldset>
	);
}

function PreserveAnimationToggle(props: TempCompressionSettingsProps) {
	return (
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Preserve Animation</legend>
			<input
				checked={props.store.preserveAnim}
				class="toggle"
				onInput={(e) => props.set("preserveAnim", e.target.checked)}
				type="checkbox"
			/>
		</fieldset>
	);
}

function CompressionEnabledToggle(props: {
	enabled: boolean;
	scope: SettingsScope;
	onInput: (enabled: boolean) => void;
}) {
	return (
		<label class="flex gap-2">
			<span class="label">Enabled?</span>
			<input
				checked={props.enabled}
				class={`toggle toggle-sm ${props.scope === "default" ? "toggle-primary" : "toggle-secondary"}`}
				onInput={(e) => props.onInput(e.target.checked)}
				type="checkbox"
			/>
		</label>
	);
}

export function PopupCompressionSettings(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
	/** Accordion name */
	name: string;
}) {
	const siteSpecificGeneralSettingsStorageItem = () =>
		getSiteSpecificGeneralSettingsStorageItem(props.tabUrl);
	const siteSpecificCompressionSettingsStorageItem = () =>
		getSiteSpecificCompressionSettingsStorageItem(props.tabUrl);

	const siteSpecificGeneralSettingsSignal = convertStorageItemToReactiveSignal(
		siteSpecificGeneralSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	const siteSpecificCompressionToggle = () =>
		siteSpecificGeneralSettingsSignal().compression;

	const defaultGeneralSettingsSignal = convertStorageItemToReactiveSignal(
		() => defaultGeneralSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	const defaultCompressionSettings = convertStorageItemToReactiveSignal(
		() => defaultCompressionSettingsStorageItem,
		DEFAULT_COMPRESSION_SETTINGS,
	);

	const siteSpecificCompressionSettings = convertStorageItemToReactiveSignal(
		siteSpecificCompressionSettingsStorageItem,
		DEFAULT_COMPRESSION_SETTINGS,
	);

	const compressionToggle = () =>
		props.scope === "default"
			? defaultGeneralSettingsSignal().compression
			: siteSpecificCompressionToggle();

	const compressionSettings = () =>
		props.scope === "default"
			? defaultCompressionSettings()
			: siteSpecificCompressionSettings();

	const [tempCompressionSettings, setTempCompressionSettings] = createStore(
		compressionSettings(),
	);

	// Sync external changes
	createEffect(
		on(compressionSettings, (settings) => setTempCompressionSettings(settings)),
	);

	// // Sync whenever the scope is changed
	// createEffect(
	// 	on(
	// 		compressionSettings,
	// 		(compressionSettings) =>
	// 			compressionSettings && setTempCompressionSettings(compressionSettings),
	// 	),
	// );

	const handleUpdateCompressionSettings = (e: SubmitEvent) => {
		e.preventDefault();

		if (props.scope === "default")
			defaultCompressionSettingsStorageItem.setValue(tempCompressionSettings);
		else
			siteSpecificCompressionSettingsStorageItem().setValue(
				tempCompressionSettings,
			);
	};

	const handleUpdateCompressionToggle = () => {
		if (props.scope === "default") {
			const store = defaultGeneralSettingsSignal();
			defaultGeneralSettingsStorageItem.setValue({
				...store,
				compression: !store.compression,
			});
		} else {
			const store = siteSpecificGeneralSettingsSignal();
			siteSpecificGeneralSettingsStorageItem().setValue({
				...store,
				compression: !store.compression,
			});
		}
	};

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title flex justify-between font-semibold">
				<span>Compression Settings</span>

				<CompressionEnabledToggle
					enabled={compressionToggle()}
					onInput={handleUpdateCompressionToggle}
					scope={props.scope}
				/>
			</summary>
			<div class="collapse-content text-sm">
				<form
					class="grid grid-cols-2 gap-4"
					onSubmit={handleUpdateCompressionSettings}
				>
					<CompressionFormatSelect
						set={setTempCompressionSettings}
						store={tempCompressionSettings}
					/>
					<CompressionModeSelect
						set={setTempCompressionSettings}
						store={tempCompressionSettings}
					/>
					<PreferredEndpointSelect
						set={setTempCompressionSettings}
						store={tempCompressionSettings}
					/>
					<CompressionQualityInput
						set={setTempCompressionSettings}
						store={tempCompressionSettings}
					/>
					<PreserveAnimationToggle
						set={setTempCompressionSettings}
						store={tempCompressionSettings}
					/>

					<BaseButton class="btn-primary" type="submit">
						💾 Save Changes
					</BaseButton>
				</form>
			</div>
		</details>
	);
}
