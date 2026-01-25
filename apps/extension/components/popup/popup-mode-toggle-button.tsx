import { Pause, Play } from "lucide-solid";
import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import { PopupContext } from "./context";

/**
 * - `default` -> use default settings
 * - `off` -> disable all settings
 * - `site` -> use site settings
 */
type ToggleMode = "default" | "off" | "site";

type TooltipTipProps = {
	mode: ToggleMode;
};

function TooltipTip(props: TooltipTipProps) {
	const [context] = useContext(PopupContext);

	return (
		<div class="text-sm">
			<Switch>
				<Match when={props.mode === "default"}>
					<Show
						fallback={
							<>
								Click to use <span class="text-info">site-scoped</span>{" "}
								settings.
							</>
						}
						when={context.scope === "default"}
					>
						Click to turn <span class="text-info">off</span>.
					</Show>
				</Match>

				<Match when={props.mode === "site"}>
					Click to turn <span class="text-info">off</span>.
				</Match>

				<Match when={props.mode === "off"}>
					Click to use <span class="text-info">default</span> settings.
				</Match>
			</Switch>
		</div>
	);
}

export default function PopupModeToggleButton() {
	const [context] = useContext(PopupContext);

	const mode = createMemo<ToggleMode>(() => {
		const val = context.generalSettings.val;

		if (context.scope === "default" || val.ruleIdOffset == null)
			return val.enabled ? "default" : "off";

		return "site";
	});

	const handleSettingsToggle = async () => {
		const val = context.generalSettings.val;

		const setValue = (val: typeof DEFAULT_GENERAL_SETTINGS) =>
			context.generalSettings.item.setValue(val);

		if (context.scope === "default") {
			await setValue({ ...val, enabled: !val.enabled });
		} else {
			// Toggle from "default" to "site" to "off"

			// Yes, I know there are some redundancies here but I feel this is more explicit
			switch (mode()) {
				case "default":
					await setValue({
						...val,
						enabled: true,
						ruleIdOffset: await getAvailableSiteRuleIdOffset(),
					});
					break;
				case "site":
					await setValue({ ...val, enabled: false, ruleIdOffset: null });
					break;
				case "off":
					await setValue({ ...val, enabled: true, ruleIdOffset: null });
					break;
			}
		}
	};

	const isMode = createSelector(mode);

	return (
		<BaseTooltip dir="bottom" tip={<TooltipTip mode={mode()} />}>
			<BaseButton
				class={`size-12 min-w-fit transition-all duration-200 ${isMode("default") ? "btn-success" : isMode("off") ? "btn-soft" : "btn-secondary"}`}
				onClick={(_) => handleSettingsToggle()}
			>
				<Switch>
					<Match when={isMode("default")}>
						<Pause />
						Using Defaults
					</Match>

					<Match when={isMode("site")}>
						<Pause />
						Using Site Settings
					</Match>

					<Match when={isMode("off")}>
						<Play />
						Off
					</Match>
				</Switch>
			</BaseButton>
		</BaseTooltip>
	);
}
