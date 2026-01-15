import { describe, expect, test } from "bun:test";
import BatchQueue from "./batch";

describe("Queue Batcher", () => {
	const getSampleNumberBatcher = () =>
		new BatchQueue<number>({ batchSize: 10, intervalMs: 30 });

	test("Added items must remain untouched if no callbacks exist", () => {
		const batcher = getSampleNumberBatcher();

		const ITEM_COUNT = 100;

		batcher.enqueueMany(Array.from({ length: ITEM_COUNT }, (_, i) => i));

		batcher.flushNow();

		expect(batcher.size).toBe(ITEM_COUNT);
	});

	test("Added items must be drained if callbacks exist", async () => {
		const batcher = getSampleNumberBatcher();

		const ITEM_COUNT = 100;

		batcher.enqueueMany(Array.from({ length: ITEM_COUNT }, (_, i) => i));

		batcher.addCallbacks((_numbers) => {
			// A callback just has to exist
		});

		batcher.flushNow();

		await new Promise((res) => {
			setTimeout(() => {
				res(expect(batcher.size < ITEM_COUNT).toBe(true));
			}, 250);
		});
	});
});
