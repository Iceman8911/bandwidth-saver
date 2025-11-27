import {
	ImageCompressorEndpoint,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import { createMemo, For, Match, Switch } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import * as v from "valibot";
import type { SettingsScope } from "@/models/context";
import { STORAGE_DEFAULTS, STORAGE_SCHEMA } from "@/models/storage";
import { CompressionMode, StorageKey } from "@/shared/constants";
import {
	compressionSettingsStorageItem,
	getSiteScopedCompressionSettingsStorageItem,
} from "@/shared/storage";

const COMPRESSION_SCHEMA = STORAGE_SCHEMA[StorageKey.SETTINGS_COMPRESSION];
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

function CompressionModeSelect(props: TempCompressionSettingsProps) {
	return (
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Compression Mode</legend>
			<select
				class="select"
				onInput={(e) =>
					props.set(
						"mode",
						v.parse(COMPRESSION_SCHEMA.entries.mode, Number(e.target.value)),
					)
				}
			>
				<For each={Object.values(CompressionMode)}>
					{(mode) => (
						<option selected={props.store.mode === mode} value={mode}>
							<Switch>
								<Match when={mode === CompressionMode.MONKEY_PATCH}>
									Monkey Patch
								</Match>
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
				<For each={Object.values(ImageCompressorEndpoint)}>
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

function CompressionEnabledToggle(props: TempCompressionSettingsProps) {
	return (
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Enabled?</legend>
			<input
				checked={props.store.enabled}
				class="toggle toggle-primary"
				onInput={(e) => props.set("enabled", e.target.checked)}
				type="checkbox"
			/>
		</fieldset>
	);
}

export function PopupCompressionSettings(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
	/** Accordion name */
	name: string;
}) {
	const siteScopedCompressionSettingsStorageItem = () =>
		getSiteScopedCompressionSettingsStorageItem(props.tabUrl);

	const _resolvedGlobalCompressionSettings = convertStorageItemToReadonlySignal(
		compressionSettingsStorageItem,
	);
	const _resolvedSiteCompressionSettings = convertStorageItemToReadonlySignal(
		siteScopedCompressionSettingsStorageItem(),
	);

	const compressionSettings = createMemo(() =>
		props.scope === "global"
			? _resolvedGlobalCompressionSettings()
			: _resolvedSiteCompressionSettings(),
	);

	const [tempCompressionSettings, setTempCompressionSettings] = createStore(
		compressionSettings() ??
			structuredClone(STORAGE_DEFAULTS[StorageKey.SETTINGS_COMPRESSION]),
	);

	// Sync whenever the scope is changed
	createEffect(
		on(
			compressionSettings,
			(compressionSettings) =>
				compressionSettings && setTempCompressionSettings(compressionSettings),
		),
	);

	const handleUpdateCompressionSettings = (e: SubmitEvent) => {
		e.preventDefault();

		if (props.scope === "global") {
			compressionSettingsStorageItem.setValue(tempCompressionSettings);
		} else {
			siteScopedCompressionSettingsStorageItem().setValue(
				tempCompressionSettings,
			);
		}
	};

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title font-semibold">
				Image Compression Settings
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
					<CompressionEnabledToggle
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
