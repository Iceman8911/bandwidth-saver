export function PopupFooter() {
	return (
		<footer class="flex items-center justify-between">
			<span>Made with love :3</span>

			<BaseButton
				class="btn-primary btn-soft"
				onClick={browser.runtime.openOptionsPage}
			>
				Options
			</BaseButton>
		</footer>
	);
}
