/** Just a wrapper over `structuredClone` so all limitations apply */
export function clone<TCloneable>(data: Readonly<TCloneable>): TCloneable {
	return structuredClone(data);
}
