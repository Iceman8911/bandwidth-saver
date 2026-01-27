import * as immer from "immer";
import { Pause, Play } from "lucide-solid";
import {
	createMemo,
	createSelector,
	Match,
	Show,
	Switch,
	useContext,
} from "solid-js";
import type { GeneralSettingsSchema } from "@/models/storage";
import { getAvailableSiteRuleIdOffset } from "@/utils/dnr-rules";
import { BaseButton } from "../button";
import { BaseTooltip } from "../tooltip";
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
		const oldSettings = context.generalSettings.val;

		const setValue = (settings: GeneralSettingsSchema) =>
			context.generalSettings.item.setValue(settings);

		const getPatchToApply = async (): Promise<
			Partial<GeneralSettingsSchema>
		> => {
			if (context.scope === "default") return { enabled: !oldSettings.enabled };

			// Toggle from "default" to "site" to "off"
			switch (mode()) {
				case "default":
					return {
						enabled: true,
						ruleIdOffset: await getAvailableSiteRuleIdOffset(),
					};
				case "site":
					return { enabled: false, ruleIdOffset: null };
				case "off":
					return { enabled: true, ruleIdOffset: null };
				default:
					throw Error(`Didn't account for mode: ${mode()}`);
			}
		};

		const patchToApply = await getPatchToApply();

		const newSettings = immer.produce(oldSettings, (draft) =>
			Object.assign(draft, patchToApply),
		);

		await setValue(newSettings);
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
