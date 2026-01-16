class Queue<TQueueItem> {
	private _items = new Map<number, TQueueItem>();
	private _head = 0;
	private _tail = 0;

	enqueue(item: TQueueItem): void {
		this._items.set(this._tail, item);

		this._tail++;
	}

	enqueueMany(items: Iterable<TQueueItem>): void {
		for (const item of items) {
			this.enqueue(item);
		}
	}

	dequeue(): TQueueItem | undefined {
		if (this.isEmpty) {
			// empty queues can have thier indices reset
			this._head = 0;
			this._tail = 0;

			return undefined;
		}

		const item = this._items.get(this._head);

		this._items.delete(this._head);

		this._head++;
		return item;
	}

	get peek(): TQueueItem | undefined {
		return this._items.get(this._head);
	}

	get size(): number {
		return this._tail - this._head;
	}

	get isEmpty(): boolean {
		return this.size === 0;
	}
}

type BatchQueueConstructorOptions = {
	/** Max amount of pending data items that may be processed at once */
	batchSize: number;
	/** Time in ms between each batch processing */
	intervalMs: number;
};

type TimeoutId = ReturnType<typeof setTimeout>;

/** For queuing up pending data to process and processing them efficiently in batches of defined or variable size (if a time budget is given).
 *
 * I.e adding a new entry/ies will cause
 */
export class BatchQueue<
	TQueueItem extends Readonly<unknown>,
> extends Queue<TQueueItem> {
	private _callbacks = new Set<(data: ReadonlyArray<TQueueItem>) => void>();
	private _flushTimeoutId: TimeoutId | null = null;

	constructor(
		private readonly _options: Readonly<BatchQueueConstructorOptions>,
	) {
		super();
	}

	private _buildBatch(): ReadonlyArray<TQueueItem> {
		const batch: TQueueItem[] = [];

		while (batch.length < this._options.batchSize) {
			const possibleItem = this.dequeue();

			if (possibleItem == null) break;

			batch.push(possibleItem);
		}

		return batch;
	}

	private async _runCallbacks(batch: ReadonlyArray<TQueueItem>): Promise<void> {
		const promises: Promise<void>[] = [];

		for (const cb of this._callbacks) {
			promises.push(
				Promise.resolve()
					.then(() => cb(batch))
					.catch((err) => {
						console.error("BatchQueue callback error:", err);
					}),
			);
		}

		await Promise.all(promises);
	}

	private async _processBatch(): Promise<void> {
		if (!this._callbacks.size) return;

		await this._runCallbacks(this._buildBatch());
	}

	override enqueue(item: TQueueItem): void {
		super.enqueue(item);
		if (this.size) this.flushNow();
	}

	/** Continuously starts batch processing until the queue is empty */
	flushNow(): void {
		if (this._flushTimeoutId != null) return;

		this._flushTimeoutId = setTimeout(async () => {
			this._flushTimeoutId = null;
			await this._processBatch();

			if (this.size) {
				this.flushNow();
			}
		}, this._options.intervalMs);
	}

	stopFlush(): void {
		if (this._flushTimeoutId != null) {
			clearTimeout(this._flushTimeoutId);
			this._flushTimeoutId = null;
		}
	}

	addCallbacks(
		...callbacks: ((data: ReadonlyArray<TQueueItem>) => void)[]
	): void {
		for (const cb of callbacks) {
			this._callbacks.add(cb);
		}
	}

	removeCallbacks(
		...callbacks: ((data: ReadonlyArray<TQueueItem>) => void)[]
	): void {
		for (const cb of callbacks) {
			this._callbacks.delete(cb);
		}
	}

	clearCallbacks() {
		this.removeCallbacks(...this._callbacks);
	}
}
