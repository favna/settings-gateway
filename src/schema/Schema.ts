import { SchemaFolder } from './SchemaFolder';
import { SchemaEntry, SchemaEntryOptions, SchemaEntryJson } from './SchemaEntry';
import { isFunction } from '@klasa/utils';
import { SettingsFolder } from '../settings/SettingsFolder';
import { Language } from 'klasa';
import { Guild } from 'discord.js';

export class Schema extends Map<string, SchemaFolder | SchemaEntry> {

	/**
	 * The base path for this schema.
	 */
	public readonly path: string;

	/**
	 * The type of this schema.
	 */
	public readonly type: 'Folder';

	/**
	 * The defaults for this schema.
	 */
	public readonly defaults: SettingsFolder;

	/**
	 * Whether or not this instance is ready.
	 */
	private ready: boolean;

	/**
	 * Constructs the schema
	 */
	public constructor(basePath = '') {
		super();

		this.ready = false;
		this.path = basePath;
		this.type = 'Folder';
		this.defaults = new SettingsFolder(this);
	}

	/**
	 * Adds or replaces an entry to this instance.
	 * @param key The key of the entry to add
	 * @param value The entry to add
	 */
	public set(key: string, value: SchemaFolder | SchemaEntry): this {
		if (this.ready) throw new Error('Cannot modify the schema after being initialized.');
		this.defaults.set(key, value instanceof Schema ? value.defaults : value.default);
		return super.set(key, value);
	}

	/**
	 * Removes an entry from this instance.
	 * @param key The key of the element to remove
	 */
	public delete(key: string): boolean {
		if (this.ready) throw new Error('Cannot modify the schema after being initialized.');
		this.defaults.delete(key);
		return super.delete(key);
	}

	public add(key: string, type: string, options: SchemaEntryOptions): this;
	public add(key: string, callback: SchemaAddCallback): this;
	public add(key: string, typeOrCallback: string | SchemaAddCallback, options?: SchemaEntryOptions): this {

		let SchemaCtor: typeof SchemaEntry | typeof SchemaFolder;
		let type: string;
		let callback: SchemaAddCallback | null = null;
		if (isFunction(typeOrCallback)) {
			type = 'Folder';
			SchemaCtor = SchemaFolder;
			callback = typeOrCallback;
		} else {
			type = typeOrCallback;
			SchemaCtor = SchemaEntry;
			callback = null;
		}

		const previous = super.get(key);
		if (typeof previous !== 'undefined') {
			if (type === 'Folder') {
				if (previous.type === 'Folder') {
					// Call the callback with the pre-existent Folder
					if (callback !== null) callback(previous as SchemaFolder);
					return this;
				}

				// If the type of the new entry is a Folder, the previous must also be a Folder.
				throw new Error(`The type for "${key}" conflicts with the previous value, expected type "Folder", got "${previous.type}".`);
			}

			// If the type of the new entry is not a Folder, the previous must also not be a Folder.
			if (previous.type === 'Folder') {
				throw new Error(`The type for "${key}" conflicts with the previous value, expected a non-Folder, got "${previous.type}".`);
			}

			// Edit the previous key
			(previous as SchemaEntry).edit({ type, ...options });
			return this;
		}

		const entry = new SchemaCtor(this, key, type, options);
		if (callback !== null) callback(entry as SchemaFolder);
		this.set(key, entry);
		return this;
	}

	/**
	 * Get a children entry from this schema.
	 * @param path The key or path to get from this schema
	 */
	public get(path: string): SchemaFolder | SchemaEntry | undefined {
		const index = path.indexOf('.');
		if (index === -1) return super.get(path);

		const key = path.substring(0, index);
		const value = super.get(key);

		// If the returned value was undefined, return undefined
		if (typeof value === 'undefined') return undefined;

		// If the returned value is a SchemaFolder, return its result from SchemaFolder#get using remaining string
		if (value.type === 'Folder') return (value as SchemaFolder).get(path.substring(index + 1));

		// Return value
		return value;
	}

	public resolve(settings: SettingsFolder, language: Language, guild: Guild | null) {
		const promises = [];
		for (const entry of this.values(true)) {
			promises.push(entry.resolve(settings, language, guild));
		}

		return Promise.all(promises);
	}

	/**
	 * Returns a new Iterator object that contains the keys for each element contained in this folder.
	 * Identical to [Map.keys()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys)
	 * @param recursive Whether the iteration should be recursive
	 */
	public *keys(recursive = false): IterableIterator<string> {
		if (recursive) {
			for (const [key, value] of super.entries()) {
				if (value.type === 'Folder') yield* (value as SchemaFolder).keys(true);
				else yield key;
			}
		} else {
			yield* super.keys();
		}
	}

	/**
	 * Returns a new Iterator object that contains the values for each element contained in this folder.
	 * Identical to [Map.values()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values)
	 * @param recursive Whether the iteration should be recursive
	 */
	public values(recursive: true): IterableIterator<SchemaEntry>;
	public values(recursive?: false): IterableIterator<SchemaFolder | SchemaEntry>;
	public *values(recursive = false): IterableIterator<SchemaFolder | SchemaEntry> {
		if (recursive) {
			for (const value of super.values()) {
				if (value.type === 'Folder') yield* (value as SchemaFolder).values(true);
				else yield value;
			}
		} else {
			yield* super.values();
		}
	}

	/**
	 * Returns a new Iterator object that contains the `[key, value]` pairs for each element contained in this folder.
	 * Identical to [Map.entries()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries)
	 * @param recursive Whether the iteration should be recursive
	 */
	public entries(recursive: true): IterableIterator<[string, SchemaEntry]>;
	public entries(recursive?: false): IterableIterator<[string, SchemaFolder | SchemaEntry]>;
	public *entries(recursive = false): IterableIterator<[string, SchemaFolder | SchemaEntry]> {
		if (recursive) {
			for (const [key, value] of super.entries()) {
				if (value.type === 'Folder') yield* (value as SchemaFolder).entries(recursive);
				else yield [key, value];
			}
		} else {
			yield* super.entries();
		}
	}

	public toJSON(): SchemaJson {
		return Object.fromEntries([...this.entries()].map(([key, value]) => [key, value.toJSON()]));
	}

}

export interface SchemaAddCallback {
	(folder: SchemaFolder): unknown;
}

export interface SchemaFolderJson extends Record<string, SchemaFolderJson | SchemaEntryJson> { }
export interface SchemaJson extends Record<string, SchemaFolderJson | SchemaEntryJson> { }
