import { ExtensionData } from "@/shared/constants";

function ExtensionLogoAndName() {
	return (
		<div class="flex items-center justify-center gap-4">
			<div class="avatar">
				<div class="size-10 rounded">
					<img alt={`${ExtensionData.NAME} Logo`} src="icons/128.png" />
				</div>
			</div>

			<div class="flex flex-col leading-tight">
				<h1 class="whitespace-nowrap font-bold text-xl">
					{ExtensionData.NAME}
				</h1>

				<p class="text-xs opacity-70">Options • Summary</p>
			</div>
		</div>
	);
}

function SummaryActions() {
	return (
		<div class="*:btn-soft flex items-center gap-2">
			<BaseButton class="btn-secondary">Export</BaseButton>

			<BaseButton class="btn-accent">Import</BaseButton>

			<BaseButton class="btn-error">Reset Stats</BaseButton>
		</div>
	);
}

export default function OptionsPageNavigationBar() {
	return (
		<div class="flex h-16 items-center justify-between gap-6 overflow-auto overflow-y-clip bg-base-300 px-4">
			<ExtensionLogoAndName />

			<SummaryActions />
		</div>
	);
}
