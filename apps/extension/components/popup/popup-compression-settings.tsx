import {
	deduplicateArrayElements,
	ImageCompressorEndpoint,
} from "@bandwidth-saver/shared";
import { isEqual } from "@ver0/deep-equal";
import { Save } from "lucide-solid";
import {
	createEffect,
	createMemo,
	For,
	Match,
	Show,
	Switch,
	useContext,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import * as v from "valibot";
import {
	CompressionSettingsSchema,
	DEFAULT_COMPRESSION_SETTINGS,
} from "@/models/storage";
import { CompressionMode } from "@/shared/constants";
import {
	defaultCompressionSettingsStorageItem,
	getSiteSpecificCompressionSettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { BaseButton } from "../button";
import { InformativeTooltip } from "../tooltip";
import { PopupContext } from "./context";

const COMPRESSION_FORMATS = [
	"auto",
	"avif",
	"jpg",
	"webp",
] as const satisfies CompressionSettingsSchema["format"][];

type TempCompressionSettingsProps = {
	store: CompressionSettingsSchema;
	set: SetStoreFunction<CompressionSettingsSchema>;
};

function CompressionFormatSelect(props: TempCompressionSettingsProps) {
	return (
		<>
			<label class="flex items-center" for="compress-format">
				Compressed Image Format:
			</label>

			<select
				class="select"
				id="compress-format"
				onInput={(e) =>
					props.set(
						"format",
						v.parse(CompressionSettingsSchema.entries.format, e.target.value),
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
		</>
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
		<>
			<label class="flex items-center justify-between" for="compress-mode">
				<span>Compression Mode:</span>

				<InformativeTooltip
					dir="top"
					tip={
						<div class="w-3xs space-y-2 text-xs">
							<CompressionModeTooltip mode={props.store.mode} />
						</div>
					}
				/>
			</label>

			<select
				class="select"
				id="compress-mode"
				onInput={(e) =>
					props.set(
						"mode",
						v.parse(CompressionSettingsSchema.entries.mode, e.target.value),
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
		</>
	);
}

function PreferredEndpointSelect(props: TempCompressionSettingsProps) {
	return (
		<>
			<label class="flex items-center" for="compress-preferred-endpoint">
				Preferred Compression Endpoint:
			</label>

			<select
				class="select"
				id="compress-preferred-endpoint"
				onInput={(e) =>
					props.set(
						"preferredEndpoint",
						v.parse(
							CompressionSettingsSchema.entries.preferredEndpoint,
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
		</>
	);
}

function CompressionQualityInput(props: TempCompressionSettingsProps) {
	return (
		<>
			<label class="flex items-center" for="compress-quality">
				Compression Quality:
			</label>

			<input
				class="input"
				id="compress-quality"
				max={100}
				min={0}
				onInput={(e) => props.set("quality", Number(e.target.value))}
				type="number"
				value={props.store.quality}
			/>
		</>
	);
}

function PreserveAnimationToggle(props: TempCompressionSettingsProps) {
	return (
		<>
			<label class="flex items-center gap-2" for="compress-preserve-animation">
				Preserve Animation:
			</label>

			<input
				checked={props.store.preserveAnim}
				class="toggle"
				id="compress-preserve-animation"
				onInput={(e) => props.set("preserveAnim", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

function CompressionEnabledToggle(props: {
	enabled: boolean;
	onInput: (enabled: boolean) => void;
}) {
	const [context] = useContext(PopupContext);

	return (
		<>
			<label class="flex gap-2" for="compress-enabled">
				Enable Compression:
			</label>

			<input
				checked={props.enabled}
				class={`toggle ${context.scope === "default" ? "toggle-primary" : "toggle-secondary"}`}
				id="compress-enabled"
				onInput={(e) => props.onInput(e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

export default function PopupCompressionSettings() {
	const [context] = useContext(PopupContext);

	const generalSettings = () => context.generalSettings;

	const compressionSettingsStorageItem = createMemo(() => {
		if (context.scope === "default")
			return defaultCompressionSettingsStorageItem;

		return getSiteSpecificCompressionSettingsStorageItem(context.tabOrigin);
	});

	const compressionSettings = convertStorageItemToReactiveSignal(
		compressionSettingsStorageItem,
		DEFAULT_COMPRESSION_SETTINGS,
	);

	const [tempCompressionSettings, setTempCompressionSettings] = createStore(
		compressionSettings(),
	);

	// Sync external changes
	createEffect(() => setTempCompressionSettings(compressionSettings()));

	const isTempCompressionSettingsUnchanged = createMemo(() =>
		isEqual(tempCompressionSettings, compressionSettings()),
	);

	const handleUpdateCompressionSettings = (e: SubmitEvent) => {
		e.preventDefault();

		compressionSettingsStorageItem().setValue(tempCompressionSettings);
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
				onSubmit={handleUpdateCompressionSettings}
			>
				<CompressionEnabledToggle
					enabled={generalSettings().val.compression}
					onInput={(isEnabled) =>
						generalSettings().item.setValue({
							...generalSettings().val,
							compression: isEnabled,
						})
					}
				/>

				<Show when={generalSettings().val.compression}>
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

					<BaseButton
						class="btn-primary col-span-2 mt-4"
						disabled={isTempCompressionSettingsUnchanged()}
						type="submit"
					>
						<Save /> Save Changes
					</BaseButton>
				</Show>
			</form>
		</Show>
	);
}
