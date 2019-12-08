import { Schema } from '../schema/Schema';
import { Settings } from './Settings';
import { SchemaFolder } from '../schema/SchemaFolder';
import { SchemaEntry } from '../schema/SchemaEntry';
import { Language } from 'klasa';
import { Client, SerializableValue, ReadonlyAnyObject, KeyedObject, ReadonlyKeyedObject } from '../types';
import { GuildResolvable } from 'discord.js';
import { isObject, objectToTuples, mergeObjects, makeObject } from '@klasa/utils';
import arraysStrictEquals from '@klasa/utils/dist/lib/arrayStrictEquals';
import { SerializerUpdateContext } from '../structures/Serializer';
import { fromEntries } from '../polyfills';

/* eslint-disable no-dupe-class-members */

export class SettingsFolder extends Map<string, SerializableValue | SettingsFolder> {

	/**
	 * The reference to the base Settings instance.
	 */
	public base: Settings | null;

	/**
	 * The schema that manages this folder's structure.
	 */
	public readonly schema: Schema;

	public constructor(schema: Schema) {
		super();
		this.base = null;
		this.schema = schema;
	}

	/**
	 * The client that manages this instance.
	 */
	public get client(): Client {
		if (this.base === null) throw new Error('Cannot retrieve gateway from a non-ready settings instance.');
		return this.base.gateway.client;
	}

	/**
	 * Get a value from the configuration. Accepts nested objects separating by dot
	 * @param path The path of the key's value to get from this instance
	 * @example
	 * // Simple get
	 * const prefix = message.guild.settings.get('prefix');
	 *
	 * // Nested entry
	 * const channel = message.guild.settings.get('channels.moderation-logs');
	 */
	public get(path: string): SettingsFolder | SerializableValue | undefined {
		try {
			return path.split('.').reduce((folder, key) => Map.prototype.get.call(folder, key), this);
		} catch {
			return undefined;
		}
	}

	/**
	 * Plucks out one or more attributes from either an object or a sequence of objects
	 * @param  paths The paths to take
	 * @example
	 * const [x, y] = message.guild.settings.pluck('x', 'y');
	 * console.log(x, y);
	 */
	public pluck(...paths: readonly string[]): (SerializableValue | undefined)[] {
		return paths.map(path => {
			const value = this.get(path);
			return value instanceof SettingsFolder ? value.toJSON() : value;
		}) as SerializableValue[];
	}

	/**
	 * Resolves paths into their full objects or values depending on the current set value
	 * @param paths The paths to resolve
	 */
	public resolve(...paths: readonly string[]): Promise<unknown[]> {
		if (this.base === null) throw new Error('Cannot retrieve guild from a non-ready settings instance.');

		const guild = this.client.guilds.resolve(this.base.target as GuildResolvable);
		const language = guild === null ? this.base.gateway.client.languages.default : guild.language;
		return Promise.all(paths.map(path => {
			const entry = this.schema.get(path);
			if (typeof entry === 'undefined') return undefined;
			return entry.type === 'Folder' ?
				this._resolveFolder({
					folder: entry as SchemaFolder,
					language,
					guild,
					extraContext: null
				}) :
				this._resolveEntry({
					entry: entry as SchemaEntry,
					language,
					guild,
					extraContext: null
				});
		}));
	}

	public async reset(paths: string | ReadonlyAnyObject | readonly string[] = [...this.keys()], options: Readonly<SettingsFolderResetOptions> = {}): Promise<SettingsUpdateResults> {
		if (this.base === null) {
			throw new Error('Cannot reset keys from a non-ready settings instance.');
		}

		if (this.base.existenceStatus === SettingsExistenceStatus.Unsynchronized) {
			throw new Error('Cannot reset keys from a pending to synchronize settings instance. Perhaps you want to call `sync()` first.');
		}

		if (this.base.existenceStatus === SettingsExistenceStatus.NotExists) {
			return [];
		}

		if (typeof paths === 'string') paths = [paths];
		else if (isObject(paths)) paths = objectToTuples(paths as Record<string, unknown>).map(entries => entries[0]);

		const { client, schema } = this;
		const onlyConfigurable = typeof options.onlyConfigurable === 'undefined' ? false : options.onlyConfigurable;
		const guild = client.guilds.resolve(typeof options.guild === 'undefined' ? this.base.target as GuildResolvable : options.guild);
		const language = guild === null ? client.languages.default : guild.language;
		const extra = options.extraContext;

		const changes: SettingsUpdateResults = [];
		for (const path of paths as readonly string[]) {
			const entry = schema.get(path);

			// If the key does not exist, throw
			if (typeof entry === 'undefined') throw language.get('SETTING_GATEWAY_KEY_NOEXT', path);
			if (entry.type === 'Folder') this._resetSchemaFolder(changes, entry as SchemaFolder, path, language, onlyConfigurable);
			else this._resetSchemaEntry(changes, entry as SchemaEntry, path, language, onlyConfigurable);
		}

		if (changes.length !== 0) await this._save({ changes, guild, language, extraContext: extra });
		return changes;
	}

	/**
	 * Update a key from this settings folder.
	 * @param path The path of the key to update
	 * @param value The new value to validate and set
	 * @param options The options for this update
	 * @example
	 * // Change the prefix to '$':
	 * await message.guild.settings.update('prefix', '$');
	 *
	 * @example
	 * // Add a new value to an array
	 * await message.guild.settings.update('disabledCommands', 'ping', { arrayAction: 'add' });
	 *
	 * @example
	 * // Remove a value from an array
	 * await message.guild.settings.update('disabledCommands', 'ping', { arrayAction: 'remove' });
	 *
	 * @example
	 * // Remove a value from an array of tuples ([[k1, v1], [k2, v2], ...])
	 * const tags = message.guild.settings.get('tags');
	 * const index = tags.findIndex(([tag]) => tag === 'foo');
	 * await message.guild.settings.update('tags', null, { arrayIndex: index });
	 */
	public update(path: string, value: SerializableValue, options?: SettingsFolderUpdateOptions): Promise<SettingsUpdateResults>;
	/**
	 * Update one or more keys from this settings folder.
	 * @param entries The key and value pairs to update
	 * @param options The options for this update
	 * @example
	 * // Change the prefix to '$' and update disabledCommands adding/removing 'ping':
	 * await message.guild.settings.update([['prefix', '$'], ['disabledCommands', 'ping']]);
	 *
	 * @example
	 * // Add a new value to an array
	 * await message.guild.settings.update([['disabledCommands', 'ping']], { arrayAction: 'add' });
	 *
	 * @example
	 * // Remove a value from an array
	 * await message.guild.settings.update([['disabledCommands', 'ping']], { arrayAction: 'remove' });
	 *
	 * @example
	 * // Remove a value from an array of tuples ([[k1, v1], [k2, v2], ...])
	 * const tags = message.guild.settings.get('tags');
	 * const index = tags.findIndex(([tag]) => tag === 'foo');
	 * await message.guild.settings.update([['tags', null]], { arrayIndex: index });
	 */
	public update(entries: [string, SerializableValue][], options?: SettingsFolderUpdateOptions): Promise<SettingsUpdateResults>;
	/**
	 * Update one or more keys using an object approach.
	 * @param entries An object to flatten and update
	 * @param options The options for this update
	 * @example
	 * // Change the prefix to '$' and update disabledCommands adding/removing 'ping':
	 * await message.guild.settings.update({ prefix: '$', disabledCommands: 'ping' });
	 *
	 * @example
	 * // Add a new value to an array
	 * await message.guild.settings.update({ disabledCommands: ['ping'] }, { arrayAction: 'add' });
	 *
	 * @example
	 * // Remove a value from an array
	 * await message.guild.settings.update({ disabledCommands: ['ping'] }, { arrayAction: 'remove' });
	 *
	 * @example
	 * // Remove a value from an array of tuples ([[k1, v1], [k2, v2], ...])
	 * const tags = message.guild.settings.get('tags');
	 * const index = tags.findIndex(([tag]) => tag === 'foo');
	 * await message.guild.settings.update({ tags: null }, { arrayIndex: index });
	 */
	public update(entries: ReadonlyAnyObject, options?: SettingsFolderUpdateOptions): Promise<SettingsUpdateResults>;
	public async update(pathOrEntries: PathOrEntries, valueOrOptions?: ValueOrOptions, options?: SettingsFolderUpdateOptions): Promise<SettingsUpdateResults> {
		if (this.base === null) {
			throw new Error('Cannot update keys from a non-ready settings instance.');
		}

		if (this.base.existenceStatus === SettingsExistenceStatus.Unsynchronized) {
			throw new Error('Cannot update keys from a pending to synchronize settings instance. Perhaps you want to call `sync()` first.');
		}

		let entries: [string, SerializableValue][];
		if (typeof pathOrEntries === 'string') {
			entries = [[pathOrEntries, valueOrOptions as SerializableValue]];
			options = typeof options === 'undefined' ? {} : options;
		} else if (isObject(pathOrEntries)) {
			entries = objectToTuples(pathOrEntries as ReadonlyKeyedObject) as [string, SerializableValue][];
			options = typeof valueOrOptions === 'undefined' ? {} : valueOrOptions as SettingsFolderUpdateOptions;
		} else {
			entries = pathOrEntries as [string, SerializableValue][];
			options = typeof valueOrOptions === 'undefined' ? {} : valueOrOptions as SettingsFolderUpdateOptions;
		}

		return this._processUpdate(entries, options);
	}

	public toJSON(): SettingsFolderJson {
		const json: SettingsFolderJson = {};
		for (const [key, value] of super.entries()) {
			json[key] = value instanceof SettingsFolder ? value.toJSON() : value;
		}

		return json;
	}

	/**
	 * Patch an object against this instance.
	 * @param data The data to apply to this instance
	 */
	protected _patch(data: ReadonlyAnyObject): void {
		for (const [key, value] of Object.entries(data)) {
			// Undefined values are invalid values, skip.
			if (typeof value === 'undefined') continue;

			// Retrieve the key and guard it, if it's undefined, it's not in the schema.
			const childValue = super.get(key);
			if (typeof childValue === 'undefined') continue;

			if (childValue instanceof SettingsFolder) childValue._patch(value as ReadonlyAnyObject);
			else super.set(key, value as SerializableValue);
		}
	}

	/**
	 * Initializes a SettingsFolder, preparing it for later usage.
	 * @param folder The children folder of this instance
	 * @param schema The schema that manages the folder
	 */
	protected _init(folder: SettingsFolder, schema: Schema | SchemaFolder): void {
		folder.base = this.base;

		for (const [key, value] of schema.entries()) {
			if (value.type === 'Folder') {
				const settings = new SettingsFolder(value as SchemaFolder);
				folder.set(key, settings);
				this._init(settings, value as SchemaFolder);
			} else {
				folder.set(key, (value as SchemaEntry).default);
			}
		}
	}

	protected async _save(context: SettingsUpdateContext): Promise<void> {
		const updateObject: KeyedObject = {};
		for (const change of context.changes) mergeObjects(updateObject, makeObject(change.entry.path, change.next));

		if (this.base === null) throw new Error('Unreachable.');

		const { gateway, id } = this.base;
		if (gateway.provider === null) throw new Error('Cannot update due to the gateway missing a reference to the provider.');
		if (this.base.existenceStatus === SettingsExistenceStatus.Exists) {
			await gateway.provider.update(gateway.name, id, updateObject);
			this._patch(updateObject);
			gateway.client.emit('settingsUpdate', this.base, updateObject, context);
		} else {
			await gateway.provider.create(gateway.name, id, updateObject);
			this.base.existenceStatus = SettingsExistenceStatus.Exists;
			this._patch(updateObject);
			gateway.client.emit('settingsCreate', this.base, updateObject, context);
		}
	}

	private async _resolveFolder(context: FolderUpdateContext): Promise<object> {
		const promises: Promise<[string, unknown]>[] = [];
		for (const entry of context.folder.values()) {
			if (entry.type === 'Folder') {
				promises.push(this._resolveFolder({
					folder: entry as SchemaFolder,
					language: context.language,
					guild: context.guild,
					extraContext: context.extraContext
				}).then(value => [entry.key, value]));
			} else {
				promises.push(this._resolveEntry({
					entry: entry as SchemaEntry,
					language: context.language,
					guild: context.guild,
					extraContext: context.extraContext
				}).then(value => [entry.key, value]));
			}
		}

		return fromEntries(await Promise.all(promises));
	}

	private async _resolveEntry(context: SerializerUpdateContext): Promise<unknown> {
		const values = this.get(context.entry.path);
		if (typeof values === 'undefined') return undefined;

		if (!context.entry.shouldResolve) return values;

		const { serializer } = context.entry;
		if (serializer === null) throw new Error('The serializer was not available during the resolve.');
		if (context.entry.array) {
			return (await Promise.all((values as readonly SerializableValue[])
				.map(value => serializer.resolve(value, context))))
				.filter(value => value !== null);
		}

		return serializer.resolve(values as SerializableValue, context);
	}

	private _resetSchemaFolder(changes: SettingsUpdateResults, schemaFolder: SchemaFolder, key: string, language: Language, onlyConfigurable: boolean): void {
		let nonConfigurable = 0;
		let skipped = 0;
		let processed = 0;

		const localPathPrefix = schemaFolder.path === '' ? '' : this.schema.path === '' ? `${schemaFolder.path}.` : `${schemaFolder.path.slice(this.schema.path.length + 1)}.`;

		// Recurse to all sub-pieces
		for (const entry of schemaFolder.values(true)) {
			if (onlyConfigurable && !entry.configurable) {
				++nonConfigurable;
				continue;
			}

			const localPath = entry.path.slice(key.length + 1);
			const previous = this.get(localPathPrefix + localPath) as SerializableValue;
			const next = entry.default;
			const equals = entry.array ?
				arraysStrictEquals(previous as unknown as readonly SerializableValue[], next as readonly SerializableValue[]) :
				previous === entry.default;

			if (equals) {
				++skipped;
			} else {
				++processed;
				changes.push({
					previous,
					next,
					entry
				});
			}
		}

		// If there are no changes, no skipped entries, and it only triggered non-configurable entries, throw.
		if (processed === 0 && skipped === 0 && nonConfigurable !== 0) throw language.get('SETTING_GATEWAY_UNCONFIGURABLE_FOLDER');
	}

	private _resetSchemaEntry(changes: SettingsUpdateResults, schemaEntry: SchemaEntry, key: string, language: Language, onlyConfigurable: boolean): void {
		if (onlyConfigurable && !schemaEntry.configurable) {
			throw language.get('SETTINGS_GATEWAY_UNCONFIGURABLE_KEY', key);
		}

		const previous = this.get(key) as SerializableValue;
		const next = schemaEntry.default;

		const equals = schemaEntry.array ?
			arraysStrictEquals(previous as unknown as readonly SerializableValue[], next as readonly SerializableValue[]) :
			previous === next;

		if (!equals) {
			changes.push({
				previous,
				next,
				entry: schemaEntry
			});
		}
	}

	private async _processUpdate(entries: [string, SerializableValue][], options: SettingsFolderUpdateOptions): Promise<SettingsUpdateResults> {
		const { client, schema } = this;
		const onlyConfigurable = typeof options.onlyConfigurable === 'undefined' ? false : options.onlyConfigurable;
		const arrayAction = typeof options.arrayAction === 'undefined' ? ArrayActions.Auto : options.arrayAction;
		const arrayIndex = typeof options.arrayIndex === 'undefined' ? null : options.arrayIndex;
		const guild = client.guilds.resolve(typeof options.guild === 'undefined' ? (this.base as Settings).target as GuildResolvable : options.guild);
		const language = guild === null ? client.languages.default : guild.language;
		const extra = options.extraContext;
		const internalOptions: InternalSettingsFolderUpdateOptions = { arrayAction, arrayIndex, onlyConfigurable };

		const promises: Promise<SettingsUpdateResult>[] = [];
		for (const [path, value] of entries) {
			const entry = schema.get(path);

			// If the key does not exist, throw
			if (typeof entry === 'undefined') throw language.get('SETTING_GATEWAY_KEY_NOEXT', path);
			if (entry.type === 'Folder') {
				const keys = onlyConfigurable ?
					[...(entry as SchemaFolder).values()].filter(val => val.type !== 'Folder').map(val => val.key) :
					[...(entry as SchemaFolder).keys()];
				throw keys.length > 0 ?
					language.get('SETTING_GATEWAY_CHOOSE_KEY', keys) :
					language.get('SETTING_GATEWAY_UNCONFIGURABLE_FOLDER');
			} else if (!(entry as SchemaEntry).configurable && onlyConfigurable) {
				throw language.get('SETTINGS_GATEWAY_UNCONFIGURABLE_KEY', path);
			}

			promises.push(this._updateSchemaEntry(path, value, { entry: entry as SchemaEntry, language, guild, extraContext: extra }, internalOptions));
		}

		const changes = await Promise.all(promises);
		if (changes.length !== 0) await this._save({ changes, guild, language, extraContext: extra });
		return changes;
	}

	// eslint-disable-next-line complexity
	private async _updateSchemaEntry(key: string, value: SerializableValue, context: SerializerUpdateContext, options: InternalSettingsFolderUpdateOptions): Promise<SettingsUpdateResult> {
		const previous = this.get(key) as SerializableValue;

		// If null or undefined, return the default value instead
		if (value === null || typeof value === 'undefined') {
			return { previous, next: context.entry.default, entry: context.entry };
		}

		if (!context.entry.array) {
			value = await this._updateSchemaEntryValue(value, context) as SerializableValue;
			return { previous, next: value, entry: context.entry };
		}

		value = Array.isArray(value) ?
			await Promise.all(value.map(val => this._updateSchemaEntryValue(val, context) as Promise<SerializableValue>)) :
			[await this._updateSchemaEntryValue(value, context) as SerializableValue];

		if (options.arrayAction === ArrayActions.Overwrite) {
			return { previous, next: value, entry: context.entry };
		}

		const next = value as readonly SerializableValue[];
		const clone = (previous as readonly SerializableValue[]).slice(0);
		if (options.arrayIndex !== null) {
			if (options.arrayIndex < 0 || options.arrayIndex > clone.length + 1) {
				throw new Error(`The index ${options.arrayIndex} is bigger than the current array. It must be a value in the range of 0..${clone.length + 1}.`);
			}

			if (options.arrayAction === ArrayActions.Add) {
				clone.splice(options.arrayIndex, 0, ...next);
			} else if (options.arrayAction === ArrayActions.Remove || next[0] === null) {
				clone.splice(options.arrayIndex, 1);
			} else {
				[clone[options.arrayIndex]] = next;
			}
		} else if (options.arrayAction === ArrayActions.Auto) {
			// Array action auto must add or remove values, depending on their existence
			for (const val of next) {
				const index = clone.indexOf(val);
				if (index === -1) clone.push(val);
				else clone.splice(index, 1);
			}
		} else if (options.arrayAction === ArrayActions.Add) {
			// Array action add must add values, throw on existent
			for (const val of next) {
				if (clone.includes(val)) throw new Error(`The value ${val} for the key ${context.entry.path} already exists.`);
				clone.push(val);
			}
		} else if (options.arrayAction === ArrayActions.Remove) {
			// Array action remove must add values, throw on non-existent
			for (const val of next) {
				const index = clone.indexOf(val);
				if (index === -1) throw new Error(`The value ${val} for the key ${context.entry.path} does not exist.`);
				clone.splice(index, 1);
			}
		} else {
			throw new TypeError(`The ${options.arrayAction} array action is not a valid array action.`);
		}

		return {
			previous,
			next: clone,
			entry: context.entry
		};
	}

	private async _updateSchemaEntryValue(value: SerializableValue, context: SerializerUpdateContext): Promise<unknown> {
		const { serializer } = context.entry;
		if (serializer === null) throw new Error('The serializer was not available during the update.');
		const parsed = await serializer.resolve(value, context);
		if (context.entry.filter !== null && context.entry.filter(this.client, parsed, context)) throw context.language.get('SETTING_GATEWAY_INVALID_FILTERED_VALUE', context.entry, value);
		return parsed;
	}

}

export const enum SettingsExistenceStatus {
	Unsynchronized,
	Exists,
	NotExists
}

export interface SettingsFolderResetOptions {
	onlyConfigurable?: boolean;
	guild?: GuildResolvable;
	extraContext?: unknown;
}

export interface SettingsFolderUpdateOptions extends SettingsFolderResetOptions {
	arrayAction?: ArrayActions;
	arrayIndex?: number | null;
}

export interface FolderUpdateContext extends Omit<SerializerUpdateContext, 'entry'> {
	folder: SchemaFolder;
}

export interface SettingsUpdateContext extends Omit<SerializerUpdateContext, 'entry'> {
	changes: SettingsUpdateResults;
}

export interface SettingsUpdateResult {
	previous: SerializableValue;
	next: SerializableValue;
	entry: SchemaEntry;
}

export interface InternalSettingsFolderUpdateOptions {
	onlyConfigurable: boolean;
	arrayAction: ArrayActions;
	arrayIndex: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SettingsUpdateResults extends Array<SettingsUpdateResult> { }

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SettingsFolderJson extends Record<string, SettingsFolderJson | SerializableValue> { }

export const enum ArrayActions {
	Add = 'add',
	Remove = 'remove',
	Auto = 'auto',
	Overwrite = 'overwrite'
}

type PathOrEntries = string | [string, SerializableValue][] | ReadonlyAnyObject;
type ValueOrOptions = SerializableValue | SettingsFolderUpdateOptions;
