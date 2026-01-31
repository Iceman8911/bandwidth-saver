import { isEqual } from "@ver0/deep-equal";
import { Save } from "lucide-solid";
import { createEffect, createMemo, Show, useContext } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import {
	DEFAULT_GENERAL_SETTINGS,
	type GeneralSettingsSchema,
} from "@/models/storage";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { BaseButton } from "../button";
import { InformativeTooltip } from "../tooltip";
import { PopupContext } from "./context";

type TempGeneralSettingsProps = {
	store: GeneralSettingsSchema;
	set: SetStoreFunction<GeneralSettingsSchema>;
};

function CspBypassTooltip() {
	return (
		<InformativeTooltip
			dir="top"
			tip={
				<div class="w-3xs space-y-2 text-error text-xs">
					<p>
						Some sites' CSP can block external image requests (e.g. redirected
						compressed images). Disabling this may <i>fix</i> those failures.
					</p>

					<p>
						This <strong>WILL</strong> weaken site security and increase XSS
						risk. <strong>Do NOT</strong> enable unless you understand the
						risks.
					</p>
				</div>
			}
		/>
	);
}

function CspBypassToggle(props: TempGeneralSettingsProps) {
	return (
		<>
			<label class="flex items-center justify-between" for="other-bypass-csp">
				Bypass CSP restrictions:
				<CspBypassTooltip />
			</label>

			<input
				checked={props.store.bypassCsp}
				class="toggle toggle-error"
				id="other-bypass-csp"
				onInput={(e) => props.set("bypassCsp", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

function DisableAutoplayToggle(props: TempGeneralSettingsProps) {
	return (
		<>
			<label class="flex items-center" for="other-disable-autoplay">
				Disable Media Autoplay:
			</label>

			<input
				checked={props.store.noAutoplay}
				class="toggle"
				id="other-disable-autoplay"
				onInput={(e) => props.set("noAutoplay", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

function LazyLoadToggle(props: TempGeneralSettingsProps) {
	return (
		<>
			<label class="flex items-center" for="other-lazy-load">
				Force lazy-loading:
			</label>

			<input
				checked={props.store.lazyLoad}
				class="toggle"
				id="other-lazy-load"
				onInput={(e) => props.set("lazyLoad", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

function SaveDataToggle(props: TempGeneralSettingsProps) {
	return (
		<>
			<label class="flex items-center" for="other-save-data">
				Force "Save-Data" headers:
			</label>

			<input
				checked={props.store.saveData}
				class="toggle"
				id="other-save-data"
				onInput={(e) => props.set("saveData", e.target.checked)}
				type="checkbox"
			/>
		</>
	);
}

export default function PopupOtherSettings() {
	const [context] = useContext(PopupContext);

	const generalSettings = () => context.generalSettings;

	const generalSettingsStorageItem = createMemo(() => {
		if (context.scope === "default") return defaultGeneralSettingsStorageItem;

		return getSiteSpecificGeneralSettingsStorageItem(context.tabOrigin);
	});

	const scopedGeneralSettings = convertStorageItemToReactiveSignal(
		generalSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	const [tempSettings, setTempSettings] = createStore(scopedGeneralSettings());

	// Sync external changes
	createEffect(() => setTempSettings(scopedGeneralSettings()));

	const isTempSettingsUnchanged = createMemo(() =>
		isEqual(tempSettings, scopedGeneralSettings()),
	);

	const handleUpdateSettings = (e: SubmitEvent) => {
		e.preventDefault();

		generalSettingsStorageItem().setValue(tempSettings);
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
					<SaveDataToggle set={setTempSettings} store={tempSettings} />
					<DisableAutoplayToggle set={setTempSettings} store={tempSettings} />
					<LazyLoadToggle set={setTempSettings} store={tempSettings} />
					<CspBypassToggle set={setTempSettings} store={tempSettings} />

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
