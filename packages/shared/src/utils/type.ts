/** Workaround / alternative for const objects as pseudo-enums */
export type ObjectToEnum<TObject extends Record<string, unknown>> =
	TObject[keyof TObject];
