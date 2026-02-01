import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { ChevronDown, Download, Settings, Upload } from "lucide-solid";
import { createSignal } from "solid-js";
import { browser } from "wxt/browser";
import { BaseButton } from "../button";

function OptionDropdownContent() {
	return (
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				as="ul"
				class="menu rounded-box border border-base-300 bg-base-100 p-2 shadow-sm"
			>
				<DropdownMenu.Item as="li">
					<button type="button">
						<Download />
						Import Settings
					</button>
				</DropdownMenu.Item>
				<DropdownMenu.Item as="li">
					<button type="button">
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
