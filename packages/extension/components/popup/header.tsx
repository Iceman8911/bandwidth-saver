import type { Setter } from "solid-js";
import * as v from "valibot";
import { SettingsScope } from "@/models/context";

type HeaderProps = {
	scope: SettingsScope;
	setScope: Setter<SettingsScope>;
};

export function PopupHeader(props: HeaderProps) {
	const isScopeSelected = createSelector(() => props.scope);

	const handleScopeSelect = ({
		target: { value },
	}: InputEvent & { target: HTMLSelectElement }) => {
		props.setScope(v.parse(SettingsScope, value));
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
