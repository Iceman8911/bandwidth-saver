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

	return (
		<div class="grid size-full grid-cols-2 grid-rows-2 place-items-center gap-2 rounded-box bg-base-200 p-2">
			<div>
				Requests Made:{" "}
				<span class="font-semibold">
					{getSumOfValuesInObject(
						statistics()?.requestsMade.dailyStats[day] ?? {},
					)}
				</span>
			</div>

			<div>
				Requests Compressed:{" "}
				<span class="font-semibold">
					{getSumOfValuesInObject(
						statistics()?.requestsCompressed.dailyStats[day] ?? {},
					)}
				</span>
			</div>

			<div>
				Data Consumed:{" "}
				<span class="font-semibold">
					{convertBytesToAppropriateNotation(bytesUsed()).join(" ")}{" "}
				</span>
			</div>

			<div>
				Data Saved:{" "}
				<span class="font-semibold">{percentageOfBytesSaved()}%</span>{" "}
			</div>
		</div>
	);
}
