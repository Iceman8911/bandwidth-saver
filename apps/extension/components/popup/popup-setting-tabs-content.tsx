import { getRandomUUID } from "@bandwidth-saver/shared";
import { FileArchive, Network, Settings } from "lucide-solid";
import type { JSXElement } from "solid-js";
import PopupCompressionSettings from "./popup-compression-settings";
import PopupOtherSettings from "./popup-other-settings";
import PopupProxySettings from "./popup-proxy-settings";

type TabWrapperProps = {
	name: string;
	header: JSXElement;
	children: JSXElement;
	isSelected: boolean;
	setIsSelected: () => void;
};

function TabWrapper(props: TabWrapperProps) {
	return (
		<>
			<label class="tab">
				<input
					checked={props.isSelected}
					name={props.name}
					onClick={props.setIsSelected}
					type="radio"
				/>

				<div class="flex gap-2">{props.header}</div>
			</label>

			<div class="tab-content overflow-auto border-base-300 bg-base-200 p-4 [scrollbar-gutter:stable]">
				{props.children}
			</div>
		</>
	);
}

type SelectedTab = "compress" | "proxy" | "other";

export default function PopupSettingsTabsContent() {
	const [selectedTab, setSelectedTab] = createSignal<SelectedTab>("compress");

	const isTabSelected = createSelector(selectedTab);

	const tabGroupName = getRandomUUID();

	return (
		<div class="tabs tabs-lift">
			<TabWrapper
				header={
					<>
						<FileArchive />
						Compression
					</>
				}
				isSelected={isTabSelected("compress")}
				name={tabGroupName}
				setIsSelected={() => setSelectedTab("compress")}
			>
				<PopupCompressionSettings />
			</TabWrapper>

			<TabWrapper
				header={
					<>
						<Network />
						Proxy
					</>
				}
				isSelected={isTabSelected("proxy")}
				name={tabGroupName}
				setIsSelected={() => setSelectedTab("proxy")}
			>
				<PopupProxySettings />
			</TabWrapper>

			<TabWrapper
				header={
					<>
						<Settings />
						Other
					</>
				}
				isSelected={isTabSelected("other")}
				name={tabGroupName}
				setIsSelected={() => setSelectedTab("other")}
			>
				<PopupOtherSettings />
			</TabWrapper>
		</div>
	);
}
