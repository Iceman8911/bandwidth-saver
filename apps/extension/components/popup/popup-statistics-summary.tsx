import { getDayStartInMillisecondsUTC } from "@bandwidth-saver/shared";
import { createMemo, useContext } from "solid-js";
import { DEFAULT_SITE_SPECIFIC_STATISTICS } from "@/models/storage";
import {
	getSiteSpecificStatisticsStorageItem,
	statisticsStorageItem,
} from "@/shared/storage";
import { getSumOfValuesInObject } from "@/utils/object";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { convertBytesToAppropriateNotation } from "@/utils/size";
import { PopupContext } from "./context";

const LOADING_TEXT = "N/A...";

export default function PopupStatisticsSummary() {
	const day = getDayStartInMillisecondsUTC();

	const [context] = useContext(PopupContext);

	const statisticsItem = createMemo(() => {
		if (context.scope === "default") return statisticsStorageItem;

		return getSiteSpecificStatisticsStorageItem(context.tabOrigin);
	});

	const statistics = convertStorageItemToReactiveSignal(
		statisticsItem,
		DEFAULT_SITE_SPECIFIC_STATISTICS,
	);

	const bytesSaved = createMemo(() =>
		getSumOfValuesInObject(statistics()?.bytesSaved.dailyStats[day] ?? {}),
	);
	const bytesUsed = createMemo(() =>
		getSumOfValuesInObject(statistics()?.bytesUsed.dailyStats[day] ?? {}),
	);

	const percentageOfBytesSaved = createMemo(() => {
		const ratio = bytesSaved() / (bytesUsed() + bytesSaved());

		if (Number.isNaN(ratio)) return 0;

		return ratio * 100;
	});

	const requestsMade = createMemo(() =>
		getSumOfValuesInObject(statistics()?.requestsMade.dailyStats[day] ?? {}),
	);

	const requestsCompressed = createMemo(() =>
		getSumOfValuesInObject(
			statistics()?.requestsCompressed.dailyStats[day] ?? {},
		),
	);

	return (
		<div class="grid size-full grid-cols-2 grid-rows-2 place-items-center gap-2 rounded-box bg-base-200 p-2">
			<div>
				Requests Made:{" "}
				<span class="font-semibold">{requestsMade() || LOADING_TEXT}</span>
			</div>

			<div>
				Requests Compressed:{" "}
				<span class="font-semibold">
					{requestsCompressed() || LOADING_TEXT}
				</span>
			</div>

			<div>
				Data Consumed:{" "}
				<span class="font-semibold">
					{bytesUsed()
						? convertBytesToAppropriateNotation(bytesUsed()).join(" ")
						: LOADING_TEXT}{" "}
				</span>
			</div>

			<div>
				Data Saved:{" "}
				<span class="font-semibold">
					{percentageOfBytesSaved()
						? `${percentageOfBytesSaved()}%`
						: LOADING_TEXT}
				</span>{" "}
			</div>
		</div>
	);
}
