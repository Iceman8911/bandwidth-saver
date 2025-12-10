import { capitalizeString, type UrlSchema } from "@bandwidth-saver/shared";
import { For, Index, Match, Switch } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import * as v from "valibot";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_GENERAL_SETTINGS, STORAGE_SCHEMA } from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import {
	defaultBlockSettingsStorageItem,
	defaultGeneralSettingsStorageItem,
	getSiteSpecificBlockSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";

const BLOCK_SETTING_SCHEMA =
	STORAGE_SCHEMA[StorageKey.DEFAULT_SETTINGS_BLOCK].item;
type BLOCK_SETTING_SCHEMA = v.InferOutput<typeof BLOCK_SETTING_SCHEMA>;

const DEFAULT_BLOCK_SETTING = v.parse(BLOCK_SETTING_SCHEMA, {
	enabled: false,
	fileType: "image",
	minSize: 80,
	type: "type",
} as const satisfies BLOCK_SETTING_SCHEMA);

const blockTypes = ["ext", "mime", "type", "url"] as const satisfies Array<
	BLOCK_SETTING_SCHEMA["type"]
>;

type TempBlockSettingsProps = {
	store: BLOCK_SETTING_SCHEMA;
	set: SetStoreFunction<BLOCK_SETTING_SCHEMA>;
};

function BlockSettingEnabledToggle(props: TempBlockSettingsProps) {
	return (
		<label class="flex flex-col gap-2">
			<span class="label text-sm">Enabled?</span>

			<input
				checked={props.store.enabled}
				class="toggle toggle-primary toggle-sm"
				onInput={(e) => props.set("enabled", e.target.checked)}
				type="checkbox"
			/>
		</label>
	);
}

function BlockSettingTypeSelect(props: TempBlockSettingsProps) {
	return (
		<label class="select select-sm">
			<span class="label"> Type</span>
			<select
				onInput={(e) =>
					//@ts-expect-error eh, this is fine
					props.set("type", e.target.value)
				}
			>
				<For each={blockTypes}>
					{(val) => (
						<option selected={props.store.type === val} value={val}>
							{capitalizeString(val)}
						</option>
					)}
				</For>
			</select>
		</label>
	);
}

function BlockSettingExtensionInput(
	props: TempBlockSettingsProps & {
		store: v.InferOutput<(typeof BLOCK_SETTING_SCHEMA.options)[1]>;
	},
) {
	return (
		<label class="input input-sm">
			<span class="label">Extension</span>

			<input
				onInput={(e) =>
					props.set({
						...props.store,
						extension: e.target.value,
					})
				}
				type="text"
				value={props.store.extension}
			/>
		</label>
	);
}

function BlockSettingMimeInput(
	props: TempBlockSettingsProps & {
		store: v.InferOutput<(typeof BLOCK_SETTING_SCHEMA.options)[2]>;
	},
) {
	return (
		<label class="input input-sm">
			<span class="label">Mimetype</span>

			<input
				onInput={(e) =>
					props.set({
						...props.store,
						mimePattern: e.target.value,
					})
				}
				type="text"
				value={props.store.mimePattern}
			/>
		</label>
	);
}

function BlockSettingUrlInput(
	props: TempBlockSettingsProps & {
		store: v.InferOutput<(typeof BLOCK_SETTING_SCHEMA.options)[3]>;
	},
) {
	return (
		<label class="input input-sm">
			<span class="label">Url Pattern</span>

			<input
				onInput={(e) =>
					props.set({
						...props.store,
						urlPattern: e.target.value,
					})
				}
				type="text"
				value={props.store.urlPattern}
			/>
		</label>
	);
}

function BlockSettingFileTypeSelect(
	props: TempBlockSettingsProps & {
		store: v.InferOutput<(typeof BLOCK_SETTING_SCHEMA.options)[0]>;
	},
) {
	const FILE_TYPE_SCHEMA = BLOCK_SETTING_SCHEMA.options[0].entries.fileType;
	type FILE_TYPE_SCHEMA = v.InferOutput<typeof FILE_TYPE_SCHEMA>;

	const FILE_TYPES = [
		"audio",
		"font",
		"image",
		"video",
	] as const satisfies FILE_TYPE_SCHEMA[];

	return (
		<label class="select select-sm">
			<span class="label">File Type</span>

			<select
				onInput={(e) =>
					props.set({
						...props.store,
						fileType: v.parse(FILE_TYPE_SCHEMA, e.target.value),
					})
				}
			>
				<For each={FILE_TYPES}>
					{(fileType) => (
						<option
							selected={props.store.fileType === fileType}
							value={fileType}
						>
							{capitalizeString(fileType)}
						</option>
					)}
				</For>
			</select>
		</label>
	);
}

function BlockSettingMinSizeInput(props: TempBlockSettingsProps) {
	return (
		<label class="input input-sm">
			<span class="label">Min Size (KB)</span>

			<input
				class="w-12"
				min={0}
				onInput={(e) => props.set("minSize", Number(e.target.value))}
				type="number"
				value={props.store.minSize}
			/>
		</label>
	);
}

function BlockSettingsList(props: {
	settings: ReadonlyArray<BLOCK_SETTING_SCHEMA>;
	updateSettings: (
		idxToUpdate: number,
		updateValue: BLOCK_SETTING_SCHEMA,
	) => void;
	removeSettings: (idxToRemove: number) => void;
}) {
	return (
		<ul class="list rounded-box bg-base-100 shadow-md">
			<Index each={props.settings}>
				{(blockSetting, idx) => {
					const [tempBlockSettings, setTempBlockSettings] = createStore(
						blockSetting(),
					);

					return (
						<div class="overflow-auto contain-inline-size">
							<li class="w-max list-row place-items-center gap-4">
								<BlockSettingEnabledToggle
									set={setTempBlockSettings}
									store={tempBlockSettings}
								/>

								<BlockSettingTypeSelect
									set={setTempBlockSettings}
									store={tempBlockSettings}
								/>

								<Switch>
									<Match
										when={tempBlockSettings.type === "ext" && tempBlockSettings}
									>
										{(blockSetting) => (
											<BlockSettingExtensionInput
												set={setTempBlockSettings}
												store={blockSetting()}
											/>
										)}
									</Match>

									<Match
										when={
											tempBlockSettings.type === "mime" && tempBlockSettings
										}
									>
										{(blockSetting) => (
											<BlockSettingMimeInput
												set={setTempBlockSettings}
												store={blockSetting()}
											/>
										)}
									</Match>

									<Match
										when={tempBlockSettings.type === "url" && tempBlockSettings}
									>
										{(blockSetting) => (
											<BlockSettingUrlInput
												set={setTempBlockSettings}
												store={blockSetting()}
											/>
										)}
									</Match>

									<Match
										when={
											tempBlockSettings.type === "type" && tempBlockSettings
										}
									>
										{(blockSetting) => {
											return (
												<BlockSettingFileTypeSelect
													set={setTempBlockSettings}
													store={blockSetting()}
												/>
											);
										}}
									</Match>
								</Switch>

								<BlockSettingMinSizeInput
									set={setTempBlockSettings}
									store={tempBlockSettings}
								/>

								{/* Other buttons */}
								<div class="flex flex-wrap items-center justify-center gap-2">
									<BaseButton
										aria-label="Save Changes"
										class="btn-primary btn-circle btn-xs"
										onClick={() => props.updateSettings(idx, tempBlockSettings)}
									>
										💾
									</BaseButton>

									<BaseButton
										aria-label="Delete Block Settings"
										class="btn-error btn-circle btn-xs"
										onClick={() => props.removeSettings(idx)}
									>
										🞭
									</BaseButton>
								</div>
							</li>
						</div>
					);
				}}
			</Index>
		</ul>
	);
}

export function PopupBlockSettings(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
	/** Accordion name */
	name: string;
}) {
	const siteSpecificGeneralSettingsStorageItem = () =>
		getSiteSpecificGeneralSettingsStorageItem(props.tabUrl);
	const siteSpecificBlockSettingsStorageItem = () =>
		getSiteSpecificBlockSettingsStorageItem(props.tabUrl);

	const siteSpecificGeneralSettingsSignal = convertStorageItemToReactiveSignal(
		siteSpecificGeneralSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	const siteSpecificBlockSettingsSignal = convertStorageItemToReactiveSignal(
		siteSpecificBlockSettingsStorageItem,
		[DEFAULT_BLOCK_SETTING],
	);

	const defaultBlockSettingsSignal = convertStorageItemToReactiveSignal(
		() => defaultBlockSettingsStorageItem,
		[DEFAULT_BLOCK_SETTING],
	);

	const defaultGeneralSettingsSignal = convertStorageItemToReactiveSignal(
		() => defaultGeneralSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	const blockToggle = () =>
		props.scope === "default"
			? defaultGeneralSettingsSignal().block
			: siteSpecificGeneralSettingsSignal().block;

	const blockSettings = () =>
		props.scope === "default"
			? defaultBlockSettingsSignal()
			: siteSpecificBlockSettingsSignal();

	const handleToggleBlockSettings = (enabled: boolean) => {
		if (props.scope === "default") {
			defaultGeneralSettingsStorageItem.setValue({
				...defaultGeneralSettingsSignal(),
				block: enabled,
			});
		} else {
			siteSpecificGeneralSettingsStorageItem().setValue({
				...siteSpecificGeneralSettingsSignal(),
				block: enabled,
			});
		}
	};

	const handleAddNewBlockSetting = () => {
		const currentSettings = blockSettings();
		const newSettings = [...currentSettings, DEFAULT_BLOCK_SETTING];

		if (props.scope === "default") {
			defaultBlockSettingsStorageItem.setValue(newSettings);
		} else {
			siteSpecificBlockSettingsStorageItem().setValue(newSettings);
		}
	};

	const handleUpdateBlockSetting = (
		idxToUpdate: number,
		value: BLOCK_SETTING_SCHEMA,
	) => {
		const currentSettings = blockSettings();
		const newSettings = currentSettings.map((setting, idx) =>
			idx === idxToUpdate ? v.parse(BLOCK_SETTING_SCHEMA, value) : setting,
		);

		if (props.scope === "default") {
			defaultBlockSettingsStorageItem.setValue(newSettings);
		} else {
			siteSpecificBlockSettingsStorageItem().setValue(newSettings);
		}
	};

	const handleRemoveBlockSetting = (idxToRemove: number) => {
		const currentSettings = blockSettings();
		const newSettings = currentSettings.toSpliced(idxToRemove, 1);

		if (props.scope === "default") {
			defaultBlockSettingsStorageItem.setValue(newSettings);
		} else {
			siteSpecificBlockSettingsStorageItem().setValue(newSettings);
		}
	};

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title flex justify-between font-semibold">
				<span>Block Settings</span>

				<label class="flex gap-2">
					<span class="label">Enabled?</span>

					<input
						checked={blockToggle()}
						class={`toggle toggle-sm ${props.scope === "default" ? "toggle-primary" : "toggle-secondary"}`}
						onInput={(e) => handleToggleBlockSettings(e.target.checked)}
						type="checkbox"
					/>
				</label>
			</summary>
			<div class="collapse-content text-sm">
				<BaseButton
					class="btn-primary btn-sm"
					onClick={handleAddNewBlockSetting}
				>
					🞦 Add Block Rule
				</BaseButton>

				<BlockSettingsList
					removeSettings={handleRemoveBlockSetting}
					settings={blockSettings()}
					updateSettings={handleUpdateBlockSetting}
				/>
			</div>
		</details>
	);
}
