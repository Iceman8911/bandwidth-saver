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
import type { JSXElement } from "solid-js";
import { convertBytesToMB } from "#imports";
import { convertBytesToAppropriateNotation } from "@/utils/size";

function extractMonthAndDayOfMonthFromDate(date: Date): string {
	const dateString = date.toDateString();

	const splitDateString = dateString.split(" ");

	const monthAndDay = `${splitDateString[1]} ${splitDateString[2]}`;

	return monthAndDay;
}

type BaseCardProps = {
	class?: string | undefined;
	title: string;
	ref: HTMLDivElement;
	children?: JSXElement;
};

function BaseCard(props: BaseCardProps) {
	return (
		<div class={`card card-border bg-base-200 ${props.class}`}>
			<div class="card-body">
				<h2 class="card-title">{props.title}</h2>

				<div class="relative h-full py-4" ref={props.ref}>
					{props.children}
				</div>
			</div>
		</div>
	);
}

export type OptionsPageBandwidthUsageOverTimeProps =
	ComponentAcceptingClassesProps & {
		/** Only 7 ~ 8 entries are needed */
		usage: ReadonlyArray<{
			date: Date;
			/** In bytes */
			dataUsed: number;
		}>;
	};

export function OptionsPageBandwidthUsageOverTimeChart(
	props: OptionsPageBandwidthUsageOverTimeProps,
) {
	let chartWrapper$!: HTMLDivElement;

	createEffect(() => {
		const [labels, series] = props.usage.reduce<[string[], number[]]>(
			(chartLabelsAndSeries, { dataUsed, date }) => {
				chartLabelsAndSeries[0].push(extractMonthAndDayOfMonthFromDate(date));
				chartLabelsAndSeries[1].push(convertBytesToMB(dataUsed));

				return chartLabelsAndSeries;
			},
			[[], []],
		);

		new LineChart(
			chartWrapper$,
			{
				labels,
				series: [series],
			},
			{ showArea: true },
		);
	});

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

export function OptionsPageBandwidthUsageBreakdownChart(
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
						(usage) => `${capitalizeString(`${usage.name}`)} (${usage.value}%)`,
					),
					series: bandwidthUsageBreakdown(),
				},
				{
					donut: true,
					donutWidth: "33%",
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
		>
			<div class="absolute top-[40%] right-[41.5%] grid grid-rows-2 place-items-center font-semibold">
				<p>Total Used:</p>

				<p>
					{convertBytesToAppropriateNotation(totalBandwidthUsed()).join(" ")}
				</p>
			</div>
		</BaseCard>
	);
}
