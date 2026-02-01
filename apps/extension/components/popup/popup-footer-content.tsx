import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { ChevronDown, Download, Settings, Upload } from "lucide-solid";
import { createResource, createSignal, onCleanup } from "solid-js";
import { useFileDialog, useObjectUrl } from "solidjs-use";
import { browser } from "wxt/browser";
import {
	exportExtensionSettingsAsString,
	importExtensionSettingsFromString,
} from "@/utils/import-and-export";
import { BaseButton } from "../button";

const downloads = browser.downloads;

const MIME_TYPE = "application/json";
const FILE_NAME = "bandwidth-saver-settings.json";

function OptionDropdownContent() {
	const { onChange: onFileDialogChange, open: openFileDialog } = useFileDialog({
		accept: MIME_TYPE,
		multiple: false,
	});

	const { off: fileDialogCleanup } = onFileDialogChange(async (fileList) => {
		const possibleFileToImport = fileList?.item(0);

		if (possibleFileToImport) {
			await importExtensionSettingsFromString(
				await possibleFileToImport.text(),
			);
		}
	});

	onCleanup(() => {
		fileDialogCleanup();
	});

	const [
		exportableSettingsJsonFile,
		{ refetch: refetchExportableSettingsJsonFile },
	] = createResource(async () => {
		const str = await exportExtensionSettingsAsString();

		return new File([str], FILE_NAME, { type: MIME_TYPE });
	});

	const exportableSettingsJsonFileUrl = useObjectUrl(
		exportableSettingsJsonFile,
	);

	const handleExportSettingsToUserDevice = async () => {
		await refetchExportableSettingsJsonFile();

		const url = exportableSettingsJsonFileUrl();

		if (url) {
			await downloads.download({ filename: FILE_NAME, url });
		}
	};

	return (
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				as="ul"
				class="menu rounded-box border border-base-300 bg-base-100 p-2 shadow-sm"
			>
				<DropdownMenu.Item as="li">
					<button onClick={() => openFileDialog()} type="button">
						<Download />
						Import Settings
					</button>
				</DropdownMenu.Item>
				<DropdownMenu.Item as="li">
					<button onClick={handleExportSettingsToUserDevice} type="button">
						<Upload />
						Export Settings
					</button>
				</DropdownMenu.Item>
				<DropdownMenu.Item
					as="li"
					onClick={() => void browser.runtime.openOptionsPage()}
				>
					<button type="button">
						<Settings />
						Options Page
					</button>
				</DropdownMenu.Item>
				<DropdownMenu.Arrow />
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	);
}

export default function PopupFooterContent() {
	const [isDropdownOpen, setIsDropdownOpen] = createSignal(false);

	return (
		<footer class="flex items-center justify-between rounded-box bg-base-200 p-4 text-sm">
			<span>Made with love :3</span>

			<DropdownMenu onOpenChange={setIsDropdownOpen} open={isDropdownOpen()}>
				<DropdownMenu.Trigger>
					<BaseButton class="btn-soft">
						More
						<DropdownMenu.Icon>
							<ChevronDown
								class={`transition-transform ${isDropdownOpen() ? "rotate-180" : ""}`}
							/>
						</DropdownMenu.Icon>
					</BaseButton>
				</DropdownMenu.Trigger>

				<OptionDropdownContent />
			</DropdownMenu>
		</footer>
	);
}
