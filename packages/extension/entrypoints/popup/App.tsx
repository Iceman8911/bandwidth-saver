// import { Tooltip } from "@/components/tooltip"

import { getRandomUUID } from "@bandwidth-saver/shared";
import { createSignal } from "solid-js";
import * as v from "valibot";
import { BaseButton } from "@/components/button";
import { STORAGE_DEFAULTS, STORAGE_SCHEMA } from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import {
	blockSettingsStorageItem,
	compressionSettingsStorageItem,
	globalSettingsStorageItem,
	proxySettingsStorageItem,
	siteScopedBlockSettingsStorageItem,
	siteScopedCompressionSettingsStorageItem,
	siteScopedGlobalSettingsStorageItem,
	siteScopedProxySettingsStorageItem,
	siteStatisticsStorageItem,
	statisticsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReadonlySignal } from "@/utils/reactivity";
import { getActiveTabOrigin } from "@/utils/tabs";

const activeTabUrl = await getActiveTabOrigin();

const PopupScope = v.picklist(["domain", "global"]);
type PopupScope = v.InferOutput<typeof PopupScope>;

const [scope, setScope] = createSignal<PopupScope>("domain");

function Header() {
	const isScopeSelected = createSelector(scope);

	const handleScopeSelect = ({
		target: { value },
	}: InputEvent & { target: HTMLSelectElement }) => {
		setScope(v.parse(PopupScope, value));
	};

	return (
		<header class="flex gap-4">
			<h2 class="text-center font-semibold text-base text-primary">
				Bandwidth Saver
			</h2>

			{/*<Tooltip tip={<div class="h-20">Data and settings shown will be in context of the current website's domain. E.g. <em>google.com</em></div>} dir="bottom">

				</Tooltip>*/}
			<label class="select select-sm select-primary">
				<span class="label">Scope</span>

				<select onInput={handleScopeSelect}>
					<option selected={isScopeSelected("domain")} value="domain">
						Domain
					</option>
					<option selected={isScopeSelected("global")} value="global">
						Global
					</option>
				</select>
			</label>
		</header>
	);
}

function Statistics() {
	const _resolvedGlobalStatistics = convertStorageItemToReadonlySignal(
		statisticsStorageItem,
	);
	const _resolvedSiteStatistics = convertStorageItemToReadonlySignal(
		siteStatisticsStorageItem,
	);

	const statistics = createMemo(() =>
		scope() === "global"
			? _resolvedGlobalStatistics()
			: activeTabUrl
				? _resolvedSiteStatistics()?.[activeTabUrl]
				: null,
	);

	const bytesSaved = createMemo(() => statistics()?.bytesSaved ?? 0);
	const bytesUsed = createMemo(() => statistics()?.bytesUsed ?? 0);
	const percentageOfBytesSaved = createMemo(() => {
		const ratio = bytesSaved() / (bytesUsed() + bytesSaved());

		if (Number.isNaN(ratio)) return 0;

		return ratio / (1024 * 1024);
	});

	return (
		<div class="grid grid-cols-2 grid-rows-2 gap-4 text-info">
			<Suspense>
				<div>Requests Processed: {statistics()?.requestsCompressed ?? 0}</div>

				<div>Requests Blocked: {statistics()?.requestsBlocked ?? 0}</div>

				<div>Data Consumed: {bytesUsed()} MB</div>

				<div>Data Saved: {percentageOfBytesSaved()}% </div>
			</Suspense>
		</div>
	);
}

function DisableToggles() {
	const globalSettings = convertStorageItemToReadonlySignal(
		globalSettingsStorageItem,
	);

	const siteScopeGlobalSettings = convertStorageItemToReadonlySignal(
		siteScopedGlobalSettingsStorageItem,
	);

	const isEnabledGlobally = () => globalSettings()?.enabled;

	const isEnabledForSite = () =>
		!!activeTabUrl && siteScopeGlobalSettings()?.[activeTabUrl]?.enabled;

	const handleGlobalToggle = () =>
		globalSettingsStorageItem.setValue({
			...(globalSettings() ?? {}),
			enabled: !isEnabledGlobally(),
		});

	const handleSiteToggle = () => {
		if (!activeTabUrl) return;

		const settings = siteScopeGlobalSettings();

		siteScopedGlobalSettingsStorageItem.setValue({
			...settings,
			[activeTabUrl]: {
				...settings?.[activeTabUrl],
				enabled: !isEnabledForSite(),
			},
		});
	};

	return (
		<div class="flex justify-around gap-4">
			<label class="space-x-2">
				<span class="label">Enabled globally</span>

				<input
					checked={isEnabledGlobally()}
					class="toggle toggle-primary"
					onClick={handleGlobalToggle}
					type="checkbox"
				/>
			</label>

			<label class="space-x-2">
				<span class="label">Enabled on this site</span>

				<input
					checked={isEnabledForSite()}
					class="toggle toggle-secondary"
					onClick={handleSiteToggle}
					type="checkbox"
				/>
			</label>
		</div>
	);
}

function BlockSettingSummary(props: { name: string }) {
	const _resolvedGlobalBlockSettings = convertStorageItemToReadonlySignal(
		blockSettingsStorageItem,
	);
	const _resolvedSiteBlockSettings = convertStorageItemToReadonlySignal(
		siteScopedBlockSettingsStorageItem,
	);

	const _blockSettings = createMemo(() =>
		scope() === "global"
			? _resolvedGlobalBlockSettings()
			: activeTabUrl
				? _resolvedSiteBlockSettings()?.[activeTabUrl]
				: null,
	);

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title font-semibold">Block Settings</summary>
			<div class="collapse-content text-sm"></div>
		</details>
	);
}

function CompressionSettingSummary(props: { name: string }) {
	const _resolvedGlobalCompressionSettings = convertStorageItemToReadonlySignal(
		compressionSettingsStorageItem,
	);
	const _resolvedSiteCompressionSettings = convertStorageItemToReadonlySignal(
		siteScopedCompressionSettingsStorageItem,
	);

	const _compressionSettings = createMemo(() =>
		scope() === "global"
			? _resolvedGlobalCompressionSettings()
			: activeTabUrl
				? _resolvedSiteCompressionSettings()?.[activeTabUrl]
				: null,
	);

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title font-semibold">
				Compression Settings
			</summary>
			<div class="collapse-content text-sm"></div>
		</details>
	);
}

function ProxySettingSummary(props: { name: string }) {
	const _resolvedGlobalProxySettings = convertStorageItemToReadonlySignal(
		proxySettingsStorageItem,
	);
	const _resolvedSiteProxySettings = convertStorageItemToReadonlySignal(
		siteScopedProxySettingsStorageItem,
	);

	const proxySettings = createMemo(() =>
		scope() === "global"
			? _resolvedGlobalProxySettings()
			: activeTabUrl
				? _resolvedSiteProxySettings()?.[activeTabUrl]
				: null,
	);

	const [tempProxySettings, setTempProxySettings] = createStore(
		proxySettings() ??
			structuredClone(STORAGE_DEFAULTS[StorageKey.SETTINGS_PROXY]),
	);

	const handleUpdateProxySettings = (e: Event) => {
		e.preventDefault();

		const parsedProxySettings = v.parse(
			STORAGE_SCHEMA[StorageKey.SETTINGS_PROXY],
			tempProxySettings,
		);

		if (scope() === "global") {
			proxySettingsStorageItem.setValue(parsedProxySettings);
		} else if (activeTabUrl) {
			siteScopedProxySettingsStorageItem.setValue({
				..._resolvedSiteProxySettings(),
				[activeTabUrl]: parsedProxySettings,
			});
		}
	};

	// Whenever the scope is changed, refresh the displayed proxy settings
	createEffect(
		on(
			[proxySettings],
			([proxySettings]) => proxySettings && setTempProxySettings(proxySettings),
		),
	);

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title font-semibold">Proxy Settings</summary>
			<div class="collapse-content text-sm">
				<form
					class="grid grid-cols-2 gap-4"
					onSubmit={handleUpdateProxySettings}
				>
					{/* Host */}
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Host</legend>
						<input
							class="input"
							onInput={(e) => setTempProxySettings("host", e.target.value)}
							placeholder="localhost"
							type="text"
							value={tempProxySettings.host}
						/>
					</fieldset>

					{/* Port */}
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Port</legend>
						<input
							class="input"
							max={65536}
							min={0}
							onInput={(e) =>
								setTempProxySettings("port", Number(e.target.value))
							}
							placeholder="3001"
							type="number"
							value={tempProxySettings.port}
						/>
					</fieldset>

					{/* Enabled */}
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Enabled</legend>
						<input
							checked={tempProxySettings.enabled}
							class="toggle toggle-primary"
							onInput={(e) => setTempProxySettings("enabled", e.target.checked)}
							type="checkbox"
						/>
					</fieldset>

					<BaseButton class="btn-primary place-self-center" type="submit">
						Save Changes
					</BaseButton>
				</form>
			</div>
		</details>
	);
}

function SettingSummaries() {
	const accordionName = getRandomUUID();

	return (
		<div class="join join-vertical bg-base-100">
			<BlockSettingSummary name={accordionName} />

			<CompressionSettingSummary name={accordionName} />

			<ProxySettingSummary name={accordionName} />
		</div>
	);
}

function Footer() {
	return <footer>Made with love :3</footer>;
}

export default function App() {
	return (
		<div class="h-fit w-96 divide-y divide-base-300 *:w-full *:p-4">
			<Header />

			<Statistics />

			<DisableToggles />

			<SettingSummaries />

			<Footer />
		</div>
	);
}
