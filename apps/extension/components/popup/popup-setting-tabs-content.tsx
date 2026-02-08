import { Tabs } from "@kobalte/core";
import { For, type JSXElement } from "solid-js";
import PopupBlockSettings from "./popup-block-settings";
import PopupCompressionSettings from "./popup-compression-settings";
import PopupOtherSettings from "./popup-other-settings";
import PopupProxySettings from "./popup-proxy-settings";

interface TabsComponentProps<TTabValue extends string> {
	default: TTabValue;
	tabs: ReadonlyArray<{
		val: TTabValue;
		header: JSXElement;
		content: () => JSXElement;
	}>;
}

function TabsComponent<TTabValue extends string>(
	props: TabsComponentProps<TTabValue>,
) {
	return (
		<Tabs.Root
			class="flex size-full flex-col contain-size"
			defaultValue={props.default}
		>
			<Tabs.List class="relative flex w-full">
				<For each={props.tabs}>
					{(tab, idx) => (
						<Tabs.Trigger
							class="btn btn-ghost rounded-none"
							classList={{
								"ml-auto": idx() === 0,
								"mr-auto": idx() === props.tabs.length - 1,
							}}
							value={tab.val}
						>
							{tab.header}
						</Tabs.Trigger>
					)}
				</For>
				<Tabs.Indicator class="absolute -bottom-1 h-0.5 bg-primary transition-all" />
			</Tabs.List>
			<For each={props.tabs}>
				{(tab) => (
					<Tabs.Content
						class="h-full overflow-auto rounded-box bg-base-200 p-4 [scrollbar-gutter:stable]"
						value={tab.val}
					>
						<tab.content />
					</Tabs.Content>
				)}
			</For>
		</Tabs.Root>
	);
}

type SelectedTab = "compress" | "proxy" | "other" | "block";

const DEFAULT_TAB: SelectedTab = "compress";

export default function PopupSettingsTabsContent() {
	return (
		<TabsComponent
			default={DEFAULT_TAB}
			tabs={[
				{
					content: PopupCompressionSettings,
					header: "Compression",
					val: "compress",
				},
				{
					content: PopupProxySettings,
					header: "Proxy",
					val: "proxy",
				},
				{
					content: PopupBlockSettings,
					header: "Block",
					val: "block",
				},
				{
					content: PopupOtherSettings,
					header: "Other",
					val: "other",
				},
			]}
		/>
	);
}
