import { SerializableValue, ReadonlyAnyObject } from '../lib/types';
import { Schema } from '../schema/Schema';
import { Settings } from './Settings';
import { Gateway } from '../gateway/Gateway';
import { SchemaFolder } from '../schema/SchemaFolder';
import { SchemaEntry } from '../schema/SchemaEntry';
import { Client, Language } from 'klasa';
import { GuildResolvable } from 'discord.js';
import { isObject, objectToTuples, mergeObjects, makeObject } from '@klasa/utils';
import arraysStrictEquals from '@klasa/utils/dist/lib/arrayStrictEquals';

export class SettingsFolder extends Map<string, SerializableValue> {

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
		return this.gateway.client;
	}

	/**
	 * The gateway that manages this instance.
	 */
	public get gateway(): Gateway {
		if (this.base === null) throw new Error('Cannot retrieve gateway from a non-ready settings instance.');
		return this.base.gateway;
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
			// noop
		}
	}

	/**
	 * Plucks out one or more attributes from either an object or a sequence of objects
	 * @param  paths The paths to take
	 * @example
	 * const [x, y] = message.guild.settings.pluck('x', 'y');
	 * console.log(x, y);
	 */
	public pluck(...paths: readonly string[]) {
		return paths.map(path => {
			const value = this.get(path);
			return value instanceof SettingsFolder ? value.toJSON() : value;
		});
	}

	/**
	 * Resolves paths into their full objects or values depending on the current set value
	 * @param paths The paths to resolve
	 */
	public resolve(...paths: readonly string[]) {
		if (this.base === null) throw new Error('Cannot retrieve guild from a non-ready settings instance.');

		const guild = this.client.guilds.resolve(this.base.target as GuildResolvable);
		const language = guild === null ? this.base.gateway.client.languages.default : guild.language;
		return Promise.all(paths.map(path => {
			const entry = this.schema.get(this.relative(path));
			return typeof entry === 'undefined' ? undefined : entry.resolve(this, language, guild);
		}));
	}

	/**
	 * Extract the relative path from an absolute one or an entry
	 * @param pathOrPiece The path or entry to substract the path from
	 */
	public relative(pathOrEntry: string | SchemaFolder | SchemaEntry): string {
		if (typeof pathOrEntry === 'string') {
			return this.schema.path.length > 0 && pathOrEntry.startsWith(this.schema.path) ?
				pathOrEntry.slice(this.schema.path.length + 1) :
				pathOrEntry;
		}

		return this.relative(pathOrEntry.path);
	}

	public async reset(paths: string | ReadonlyAnyObject | readonly string[] = [...this.keys()], options: Readonly<SettingsFolderResetOptions> = {}) {
		if (this.base === null) {
			throw new Error('Cannot reset keys from a non-ready settings instance.');
		}

		if (this.base.existenceStatus === SettingsExistenceStatus.Unsynchronized) {
			throw new Error('Cannot reset keys from a pending to synchronize settings instance. Perhaps you want to call `reset()` first.');
		}

		if (typeof paths === 'string') paths = [paths];
		else if (isObject(paths)) paths = objectToTuples(paths as Record<string, unknown>).map(entries => entries[0]);

		const { client, schema } = this;
		const onlyConfigurable = typeof options.onlyConfigurable === 'undefined' ? false : options.onlyConfigurable;
		const guild = client.guilds.resolve(typeof options.guild === 'undefined' ? this.base.target as GuildResolvable : options.guild);
		const language = guild === null ? client.languages.default : guild.language;

		const changes: SettingsUpdateResults = [];
		for (const path of paths as readonly string[]) {
			const key = this.relative(path);
			const entry = schema.get(key);

			// If the key does not exist, throw
			if (typeof entry === 'undefined') throw language.get('SETTING_GATEWAY_KEY_NOEXT', path);
			if (entry.type === 'Folder') this._resetSchemaFolder(changes, entry as SchemaFolder, key, language, onlyConfigurable);
			else this._resetSchemaEntry(changes, entry as SchemaEntry, key, language, onlyConfigurable);
		}

		await this._save(changes);
		return changes;
	}

	public toJSON() { }

	protected _init(folder: SettingsFolder, schema: Schema | SchemaFolder) {
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

	protected async _save(changes: SettingsUpdateResults) {
		const updateObject = {};
		for (const change of changes) mergeObjects(updateObject, makeObject(change.entry.path, change.next));

		if (this.base === null) throw new Error('Unreachable.');

		const { gateway, id } = this.base;
		if (gateway.provider === null) throw new Error('Cannot update due to the gateway missing a reference to the provider.');
		if (this.base.existenceStatus === SettingsExistenceStatus.Exists) {
			await gateway.provider.update(gateway.name, id, updateObject);
			gateway.client.emit('settingsUpdate', this.base, updateObject);
		} else {
			await gateway.provider.update(gateway.name, id, updateObject);
			this.base.existenceStatus = SettingsExistenceStatus.Exists;
			gateway.client.emit('settingsCreate', this.base, updateObject);
		}
	}

	private _resetSchemaFolder(changes: SettingsUpdateResults, schemaFolder: SchemaFolder, key: string, language: Language, onlyConfigurable: boolean) {
		let nonConfigurable = 0;
		let skipped = 0;
		let processed = 0;

		// Recurse to all sub-pieces
		for (const entry of schemaFolder.values(true)) {
			if (onlyConfigurable && !entry.configurable) {
				++nonConfigurable;
				continue;
			}

			const previous = this.get(entry.path.slice(key.length + 1)) as SerializableValue;
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

	private _resetSchemaEntry(changes: SettingsUpdateResults, schemaEntry: SchemaEntry, key: string, language: Language, onlyConfigurable: boolean) {
		if (onlyConfigurable && !schemaEntry.configurable) {
			throw language.get('SETTING_GATEWAY_UNCONFIGURABLE_FOLDER');
		}

		changes.push({
			previous: this.get(key) as SerializableValue,
			next: schemaEntry.default,
			entry: schemaEntry
		});
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
}

export interface SettingsUpdateResult {
	previous: SerializableValue;
	next: SerializableValue;
	entry: SchemaEntry;
}

export interface SettingsUpdateResults extends Array<SettingsUpdateResult> { }
