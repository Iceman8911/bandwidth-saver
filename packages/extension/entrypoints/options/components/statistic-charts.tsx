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
	// TODO: deal with locale issues
	const dateString = date.toDateString();

	const splitDateString = dateString.split(" ");

	const monthAndDay = `${splitDateString[1]} ${splitDateString[2]}`;

	return monthAndDay;
}

type BaseCardProps = {
	class?: string | undefined;
	children?: JSXElement;
};

type ExtendedCardProps = BaseCardProps & {
	title: string;
	ref: HTMLDivElement;
};

function BaseCard(props: BaseCardProps) {
	return (
		<div class={`card card-border bg-base-200 ${props.class}`}>
			{props.children}
		</div>
	);
}

function VerticalCard(props: ExtendedCardProps) {
	return (
		<BaseCard class={props.class}>
			<div class="card-body">
				<h2 class="card-title">{props.title}</h2>

				<div class="relative h-full py-4" ref={props.ref}>
					{props.children}
				</div>
			</div>
		</BaseCard>
	);
}

export type OptionsPageUsageOverTimeProps = ComponentAcceptingClassesProps & {
	/** Only 7 ~ 8 entries are needed */
	usage: ReadonlyArray<{
		date: Date;
		/** In bytes */
		used: number;
	}>;
};

export function OptionsPageBandwidthUsageOverTimeChart(
	props: OptionsPageUsageOverTimeProps,
) {
	let chartWrapper$!: HTMLDivElement;

	createEffect<LineChart>((oldChart) => {
		oldChart?.detach();

		const [labels, series] = props.usage.reduce<[string[], number[]]>(
			(chartLabelsAndSeries, { used, date }) => {
				chartLabelsAndSeries[0].push(extractMonthAndDayOfMonthFromDate(date));
				chartLabelsAndSeries[1].push(convertBytesToMB(used));

				return chartLabelsAndSeries;
			},
			[[], []],
		);

		return new LineChart(
			chartWrapper$,
			{
				labels,
				series: [series],
			},
			{ showArea: true },
		);
	});

	return (
		<VerticalCard
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

	createEffect<PieChart>((oldChart) => {
		oldChart?.detach();

		return new PieChart(
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
		);
	});

	return (
		<VerticalCard
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
		</VerticalCard>
	);
}

function HorizontalCard(
	props: ExtendedCardProps & {
		largeText: string;
		/** The title here will not be the largest text */
		title: string;
	},
) {
	return (
		<BaseCard class={props.class}>
			<div class="card-body h-full flex-row">
				<h2 class="card-title flex-col items-center justify-center gap-0.5 *:text-center">
					<p class="text-sm">{props.title}</p>

					<p class="whitespace-nowrap">{props.largeText}</p>
				</h2>

				<div class="relative h-full" ref={props.ref}>
					{props.children}
				</div>
			</div>
		</BaseCard>
	);
}

type BaseStatisticsChartProps = OptionsPageUsageOverTimeProps & {
	title: string;

	/** Receives the stat total and does some extra transformations with it to return a string */
	statTotalTextMod?: (total: number) => string;
};

function BaseStatisticsChart(props: BaseStatisticsChartProps) {
	let chartWrapper$!: HTMLDivElement;

	const usageSeriesAndTotal = createMemo(() =>
		props.usage.reduce<{ series: number[]; total: number }>(
			(seriesAndTotal, { used }) => {
				seriesAndTotal.series.push(used);
				seriesAndTotal.total += used;

				return seriesAndTotal;
			},
			{ series: [], total: 0 },
		),
	);

	createEffect<LineChart>((oldChart) => {
		oldChart?.detach();

		return new LineChart(
			chartWrapper$,
			{
				series: [usageSeriesAndTotal().series],
			},
			{ showArea: true, showPoint: false },
		);
	});

	return (
		<HorizontalCard
			class={props.class}
			largeText={`${props.statTotalTextMod?.(usageSeriesAndTotal().total) ?? usageSeriesAndTotal().total}`}
			ref={chartWrapper$}
			title={props.title}
		/>
	);
}

export function OptionsPageRequestsMadeChart(
	props: OptionsPageUsageOverTimeProps,
) {
	return (
		<BaseStatisticsChart
			class={props.class}
			title="Requests Made"
			usage={props.usage}
		/>
	);
}

export function OptionsPageRequestsCompressedChart(
	props: OptionsPageUsageOverTimeProps,
) {
	return (
		<BaseStatisticsChart
			class={props.class}
			title="Requests Compressed"
			usage={props.usage}
		/>
	);
}

function convertStatTotalToAppropriateNotation(total: number) {
	return convertBytesToAppropriateNotation(total).join(" ");
}

export function OptionsPageBytedUsedChart(
	props: OptionsPageUsageOverTimeProps,
) {
	return (
		<BaseStatisticsChart
			class={props.class}
			statTotalTextMod={convertStatTotalToAppropriateNotation}
			title="Data Used"
			usage={props.usage}
		/>
	);
}

export function OptionsPageBytesSavedChart(
	props: OptionsPageUsageOverTimeProps,
) {
	return (
		<BaseStatisticsChart
			class={props.class}
			statTotalTextMod={convertStatTotalToAppropriateNotation}
			title="Data Saved"
			usage={props.usage}
		/>
	);
}
