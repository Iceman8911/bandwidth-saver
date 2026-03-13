import { isEqual } from "@ver0/deep-equal";
import { Save } from "lucide-solid";
import { createEffect, createMemo, Show, useContext } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import {
	type BlockSettingsOutput,
	DEFAULT_BLOCK_SETTINGS,
} from "@/models/storage";
import {
	defaultBlockSettingsStorageItem,
	getSiteSpecificBlockSettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { BaseButton } from "../button";
import { InformativeTooltip } from "../tooltip";
import { PopupContext } from "./context";

type TempBlockSettingsProps = {
	store: BlockSettingsOutput;
	set: SetStoreFunction<BlockSettingsOutput>;
};

function BlockStyleTooltip() {
	return (
		<InformativeTooltip
			tip={
				<p class="max-w-3xs space-y-2 text-warning text-xs">
					Will make <strong>every</strong> site ugly.
				</p>
			}
		/>
	);
}

function BlockStyleToggle(props: TempBlockSettingsProps) {
	return (
		<>
			<label
				class="flex items-center justify-between text-warning"
				for="other-block-style"
			>
				Block Styles:
				<BlockStyleTooltip />
			</label>

			<input
				checked={props.store.style}
				class="toggle toggle-warning"
				id="other-block-style"
				onInput={(e) => props.set("style", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

function BlockImageToggle(props: TempBlockSettingsProps) {
	return (
		<>
			<label class="flex items-center" for="other-block-image">
				Block Images:
			</label>

			<input
				checked={props.store.image}
				class="toggle"
				id="other-block-image"
				onInput={(e) => props.set("image", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

function BlockMediaTooltip() {
	return (
		<InformativeTooltip
			tip={
				<div class="max-w-3xs space-y-2 text-xs">
					Due to browser extension limitations, it's much easier and quicker to
					lump both video and audio together.
				</div>
			}
		/>
	);
}

function BlockMediaToggle(props: TempBlockSettingsProps) {
	return (
		<>
			<label class="flex items-center justify-between" for="other-block-media">
				Block Media (Video and Audio):
				<BlockMediaTooltip />
			</label>

			<input
				checked={props.store.media}
				class="toggle"
				id="other-block-media"
				onInput={(e) => props.set("media", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

function BlockFontTooltip() {
	return (
		<InformativeTooltip
			tip={
				<div class="max-w-3xs space-y-2 text-xs">
					<p>
						When fonts are blocked, your browser will simply use it's defaults
						so the experience will be least affected
					</p>

					<p class="text-warning">
						Not that, this will break icon fonts like{" "}
						<strong>FontAwesome</strong> .
					</p>
				</div>
			}
		/>
	);
}

function BlockFontToggle(props: TempBlockSettingsProps) {
	return (
		<>
			<label class="flex items-center justify-between" for="other-block-font">
				Block Fonts:
				<BlockFontTooltip />
			</label>

			<input
				checked={props.store.font}
				class="toggle"
				id="other-block-font"
				onInput={(e) => props.set("font", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

function BlockScriptTooltip() {
	return (
		<InformativeTooltip
			tip={
				<p class="max-w-3xs space-y-2 text-warning text-xs">
					Will break most sites that rely heavily on Javascript.
				</p>
			}
		/>
	);
}

function BlockScriptToggle(props: TempBlockSettingsProps) {
	return (
		<>
			<label
				class="flex items-center justify-between text-warning"
				for="other-block-script"
			>
				Block Scripts:
				<BlockScriptTooltip />
			</label>

			<input
				checked={props.store.script}
				class="toggle toggle-warning"
				id="other-block-script"
				onInput={(e) => props.set("script", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

export default function PopupBlockSettings() {
	const [context] = useContext(PopupContext);

	const generalSettings = () => context.generalSettings;

	const blockSettingsStorageItem = createMemo(() => {
		if (context.scope === "default") return defaultBlockSettingsStorageItem;

		return getSiteSpecificBlockSettingsStorageItem(context.tabOrigin);
	});

	const blockSettings = convertStorageItemToReactiveSignal(
		blockSettingsStorageItem,
		DEFAULT_BLOCK_SETTINGS,
	);

	const [tempSettings, setTempSettings] = createStore(blockSettings());

	// Sync external changes
	createEffect(() => setTempSettings(blockSettings()));

	const isTempSettingsUnchanged = createMemo(() =>
		isEqual(tempSettings, blockSettings()),
	);

	const handleUpdateSettings = (e: SubmitEvent) => {
		e.preventDefault();

		blockSettingsStorageItem().setValue(tempSettings);
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
				onSubmit={handleUpdateSettings}
			>
				<Show when={generalSettings().val.enabled}>
					<BlockFontToggle set={setTempSettings} store={tempSettings} />
					<BlockImageToggle set={setTempSettings} store={tempSettings} />
					<BlockMediaToggle set={setTempSettings} store={tempSettings} />
					<BlockScriptToggle set={setTempSettings} store={tempSettings} />
					<BlockStyleToggle set={setTempSettings} store={tempSettings} />

					<BaseButton
						class="btn-primary col-span-2 mt-4"
						disabled={isTempSettingsUnchanged()}
						type="submit"
					>
						<Save /> Save Changes
					</BaseButton>
				</Show>
			</form>
		</Show>
	);
}
