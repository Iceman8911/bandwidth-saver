import {
	type FlatSeriesObjectValue,
	type FlatSeriesPrimitiveValue,
	LineChart,
	PieChart,
} from "chartist";
import type { DEFAULT_SINGLE_ASSET_STATISTICS } from "@/models/storage";
import type { ComponentAcceptingClassesProps } from "@/shared/types";
import "chartist/dist/index.css";
import "./bandwidth-usage.css";
import { capitalizeString } from "@bandwidth-saver/shared";
import { convertBytesToMB } from "@/utils/size";

type BaseCardProps = {
	class?: string | undefined;
	title: string;
	ref: HTMLDivElement;
};

function BaseCard(props: BaseCardProps) {
	return (
		<div class={`card card-border bg-base-200 ${props.class}`}>
			<div class="card-body">
				<h2 class="card-title">{props.title}</h2>

				<div class="h-full py-4" ref={props.ref} />
			</div>
		</div>
	);
}

export type OptionsPageBandwidthUsageOverTimeProps =
	ComponentAcceptingClassesProps & {
		/** Only 28 ~ 31 entries are needed */
		usage: ReadonlyArray<{
			date: Date;
			/** In bytes */
			dataUsed: number;
		}>;
	};

export function OptionsPageBandwidthUsageOverTime(
	props: OptionsPageBandwidthUsageOverTimeProps,
) {
	let chartWrapper$!: HTMLDivElement;

	createEffect(
		() =>
			new LineChart(
				chartWrapper$,
				{
					labels: props.usage.map((usage) => {
						const dateString = usage.date.toDateString();

						const splitDateString = dateString.split(" ");

						const monthAndDay = `${splitDateString[1]} ${splitDateString[2]}`;

						return monthAndDay;
					}),
					series: [
						props.usage.map((usage) => convertBytesToMB(usage.dataUsed)),
					],
				},
				{ showArea: true },
			),
	);

	return (
		<BaseCard
			class={props.class}
			ref={chartWrapper$}
			title="Bandwidth Usage Over Time"
		/>
	);
}

type OptionsPageBandwidthUsageBreakdownProps =
	ComponentAcceptingClassesProps & {
		usage: Readonly<typeof DEFAULT_SINGLE_ASSET_STATISTICS>;
	};

export function OptionsPageBandwidthUsageBreakdown(
	props: OptionsPageBandwidthUsageBreakdownProps,
) {
	const bandwidthUsageObjectEntryArray = createMemo(() =>
		Object.entries(props.usage),
	);

	const totalBandwidthUsed = createMemo(() =>
		bandwidthUsageObjectEntryArray().reduce(
			(total, [_, val]) => total + val,
			0,
		),
	);

	const bandwidthUsageBreakdown = createMemo(() =>
		bandwidthUsageObjectEntryArray().map<
			FlatSeriesObjectValue<FlatSeriesPrimitiveValue>
		>(([key, val]) => {
			return {
				name: key,
				value: Math.round((val / totalBandwidthUsed()) * 100),
			};
		}),
	);

	let chartWrapper$!: HTMLDivElement;

	createEffect(
		() =>
			new PieChart(
				chartWrapper$,
				{
					labels: bandwidthUsageBreakdown().map(
						(usage) =>
							`${capitalizeString(`${usage.name}s`)} (${usage.value}%)`,
					),
					series: bandwidthUsageBreakdown(),
				},
				{
					donut: true,
					donutWidth: "50%",
					ignoreEmptyValues: true,
					labelDirection: "explode",
					// labelOffset: 5,
					preventOverlappingLabelOffset: 10,
				},
			),
	);

	return (
		<BaseCard
			class={props.class}
			ref={chartWrapper$}
			title="Bandwidth Usage Breakdown"
		/>
	);
}
