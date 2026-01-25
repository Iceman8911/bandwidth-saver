export default function PopupFooterContent() {
	return (
		<footer class="flex items-center justify-between rounded-box bg-base-200 p-4 text-sm">
			<span>Made with love :3</span>

			<BaseButton
				class="btn-primary btn-soft"
				onClick={() => void browser.runtime.openOptionsPage()}
			>
				Options
			</BaseButton>
		</footer>
	);
}
