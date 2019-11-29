/**
 * Returns an object created by key-value entries for properties and methods
 * @param entries An iterable object that contains key-value entries for properties and methods.
 */
function ObjectFromEntries<T = any>(entries: Iterable<readonly [PropertyKey, T]>): { [k in PropertyKey]: T };
/**
 * Returns an object created by key-value entries for properties and methods
 * @param entries An iterable object that contains key-value entries for properties and methods.
 */
function ObjectFromEntries(entries: Iterable<readonly unknown[]>): any;
function ObjectFromEntries(entries: Iterable<readonly unknown[]>): unknown {
	const obj = {};

	for (const pair of entries) {
		if (Object(pair) !== pair) {
			throw new TypeError('iterable for fromEntries should yield objects');
		}

		const { 0: key, 1: val } = pair;

		Object.defineProperty(obj, key as PropertyKey, {
			configurable: true,
			enumerable: true,
			writable: true,
			value: val
		});
	}

	return obj;
}

export const fromEntries = typeof Object.fromEntries === 'function' ? Object.fromEntries : ObjectFromEntries;
