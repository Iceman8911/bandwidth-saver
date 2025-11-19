// import { Tooltip } from "@/components/tooltip"
import { getRandomUUID } from "@bandwidth-saver/shared";
import { createSignal } from "solid-js";
import * as v from "valibot";

const PopupScope = v.picklist(["domain", "global"]);
type PopupScope = v.InferOutput<typeof PopupScope>;

const [scope, setScope] = createSignal<PopupScope>("domain");

function Header() {
	const isScopeSelected = createSelector(scope);

	const handleScopeSelect = ({
		target: { value },
	}: InputEvent & { target: HTMLSelectElement }) => {
		setScope(v.parse(PopupScope, value));
	};

	return (
		<div class="flex gap-4">
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
		</div>
	);
}

function Statistics() {
	return (
		<div class="grid grid-cols-2 grid-rows-2 gap-4 text-info">
			<div>Requests Processed: {100}</div>

			<div>Requests Blocked: {10}</div>

			<div>Data Consumed: {100} MB</div>

			<div>Data Saved: {45}% </div>
		</div>
	);
}

function DisableToggles() {
	return (
		<div class="flex justify-around gap-4">
			<label class="space-x-2">
				<span class="label">Enabled globally</span>

				<input checked class="toggle toggle-primary" type="checkbox" />
			</label>

			<label class="space-x-2">
				<span class="label">Enabled on this site</span>

				<input checked class="toggle toggle-primary" type="checkbox" />
			</label>
		</div>
	);
}

function BlockSettingSummary(props: { name: string }) {
	return (
		<div class="collapse-arrow join-item collapse border border-base-300">
			<input name={props.name} type="radio" />
			<div class="collapse-title font-semibold">Block Settings</div>
			<div class="collapse-content text-sm">TODO</div>
		</div>
	);
}

function CompressionSettingSummary(props: { name: string }) {
	return (
		<div class="collapse-arrow join-item collapse border border-base-300">
			<input name={props.name} type="radio" />
			<div class="collapse-title font-semibold">Compression Settings</div>
			<div class="collapse-content text-sm">TODO</div>
		</div>
	);
}

function ProxySettingSummary(props: { name: string }) {
	return (
		<div class="collapse-arrow join-item collapse border border-base-300">
			<input name={props.name} type="radio" />
			<div class="collapse-title font-semibold">Proxy Settings</div>
			<div class="collapse-content text-sm">TODO</div>
		</div>
	);
}

function SettingSummaries() {
	const accordionName = getRandomUUID();

	return (
		<div class="join join-vertical bg-base-100">
			<BlockSettingSummary name={accordionName} />

			<CompressionSettingSummary name={accordionName} />

			<ProxySettingSummary name={accordionName} />
		</div>
	);
}

function Footer() {
	return "";
}

export default function App() {
	return (
		<div class="h-fit w-96 divide-y divide-base-300 *:w-full *:p-4">
			<Header />

			<Statistics />

			<DisableToggles />

			<SettingSummaries />

			<Footer />
		</div>
	);
}
