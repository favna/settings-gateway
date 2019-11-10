import { Client, Language, Serializer } from 'klasa';
import { Schema } from './Schema';
import { isNumber, isFunction } from '@klasa/utils';
import { SettingsFolder } from '../settings/SettingsFolder';
import { Guild } from 'discord.js';
import { SchemaFolder } from './SchemaFolder';

export class SchemaEntry {

	/**
	 * The KlasaClient for this SchemaEntry.
	 */
	public client: Client | null = null;

	/**
	 * The schema that manages this instance.
	 */
	public readonly parent: Schema | SchemaFolder;

	/**
	 * The key of this entry relative to its parent.
	 */
	public readonly key: string;

	/**
	 * The absolute key of this entry.
	 */
	public readonly path: string;

	/**
	 * The type of data this entry manages.
	 */
	public type: string;

	/**
	 * Whether or not this entry should hold an array of data.
	 */
	public array: boolean;

	/**
	 * The default value this entry will set when reverting a setting back to or when the key was not set.
	 */
	public default: unknown;

	/**
	 * The minimum value for this entry.
	 */
	public minimum: number | null;

	/**
	 * The maximum value for this entry.
	 */
	public maximum: number | null;

	/**
	 * Whether this entry should inclusively or exclusively check minimum and maximum on key validation.
	 */
	public inclusive: boolean;

	/**
	 * Whether or not this entry should be configurable by the configuration command.
	 */
	public configurable: boolean;

	/**
	 * The filter to use for this entry when resolving.
	 */
	public filter: SchemaEntryFilterFunction | null;

	/**
	 * Whether or not values managed by this entry should be resolved.
	 */
	public shouldResolve: boolean;

	public constructor(parent: Schema | SchemaFolder, key: string, type: string, options: SchemaEntryOptions = {}) {
		this.client = null;
		this.parent = parent;
		this.key = key;
		this.path = this.parent.path.length === 0 ? `${this.parent.path}.${this.key}` : this.key;
		this.type = type.toLowerCase();
		this.array = 'array' in options ? options.array : 'default' in options ? Array.isArray(options.default) : false;
		this.default = 'default' in options ? options.default : this.generateDefaultValue();
		this.minimum = 'minimum' in options ? options.minimum : null;
		this.maximum = 'maximum' in options ? options.maximum : null;
		this.inclusive = 'inclusive' in options ? options.inclusive : false;
		this.configurable = 'configurable' in options ? options.configurable : this.type !== 'any';
		this.filter = 'filter' in options ? options.filter : null;
		this.shouldResolve = 'resolve' in options ? options.resolve : true;
	}

	public get serializer(): Serializer {
		return this.client.serializers.get(this.type);
	}

	public edit(options: SchemaEntryEditOptions = {}): this {
		if ('type' in options) this.type = options.type;
		if ('array' in options) this.array = options.array;
		if ('configurable' in options) this.configurable = options.configurable;
		if ('default' in options) this.default = options.default;
		if ('filter' in options) this.filter = options.filter;
		if ('inclusive' in options) this.inclusive = options.inclusive;
		if ('resolve' in options) this.shouldResolve = options.resolve;

		if (('minimum' in options) || ('maximum' in options)) {
			const { minimum = null, maximum = null } = options;
			this.minimum = minimum;
			this.maximum = maximum;
		}

		return this;
	}

	public check(): void {
		// Check type
		if (typeof this.type !== 'string') throw new TypeError(`[KEY] ${this.path} - Parameter type must be a string.`);
		if (!this.client.serializers.has(this.type)) throw new TypeError(`[KEY] ${this.path} - ${this.type} is not a valid type.`);

		// Check array
		if (typeof this.array !== 'boolean') throw new TypeError(`[KEY] ${this.path} - Parameter array must be a boolean.`);

		// Check configurable
		if (typeof this.configurable !== 'boolean') throw new TypeError(`[KEY] ${this.path} - Parameter configurable must be a boolean.`);

		// Check limits
		if (this.minimum !== null && !isNumber(this.minimum)) throw new TypeError(`[KEY] ${this.path} - Parameter min must be a number or null.`);
		if (this.maximum !== null && !isNumber(this.maximum)) throw new TypeError(`[KEY] ${this.path} - Parameter max must be a number or null.`);
		if (this.minimum !== null && this.maximum !== null && this.minimum > this.maximum) throw new TypeError(`[KEY] ${this.path} - Parameter min must contain a value lower than the parameter max.`);

		// Check filter
		if (this.filter !== null && !isFunction(this.filter)) throw new TypeError(`[KEY] ${this.path} - Parameter filter must be a function`);

		// Check default
		if (this.array) {
			if (!Array.isArray(this.default)) throw new TypeError(`[DEFAULT] ${this.path} - Default key must be an array if the key stores an array.`);
		} else if (this.default !== null) {
			if (['boolean', 'string'].includes(this.type) && typeof this.default !== this.type) throw new TypeError(`[DEFAULT] ${this.path} - Default key must be a ${this.type}.`);
		}
	}

	public async resolve(settings: SettingsFolder, language: Language, guild: Guild): Promise<unknown> {
		const values = settings.get(this.path);
		if (!this.shouldResolve) return values;

		const { serializer } = this;
		if (this.array) {
			return (await Promise.all((values as readonly unknown[]).map(value => serializer.deserialize(value, this, language, guild))))
				.filter(value => value !== null);
		}

		return serializer.deserialize(values, this, language, guild);
	}

	/**
	 * Parses a value into a resolved format for Settings.
	 * @param value The value to parse
	 * @param guild The guild to use for parsing
	 */
	public async parse(value: unknown, guild: Guild | null = null): Promise<unknown> {
		const language = guild === null ? guild.language : this.client.languages.default;
		const parsed = await this.serializer.deserialize(value, this, language, guild);
		if (this.filter !== null && this.filter(this.client, parsed, this, language)) throw language.get('SETTING_GATEWAY_INVALID_FILTERED_VALUE', this, value);
		return parsed;
	}

	public toJSON(): SchemaEntryJson {
		return {
			'type': this.type,
			'array': this.array,
			'configurable': this.configurable,
			'default': this.default,
			'inclusive': this.inclusive,
			'maximum': this.maximum,
			'minimum': this.minimum,
			'resolve': this.shouldResolve
		};
	}

	private generateDefaultValue() {
		if (this.array) return [];
		if (this.type === 'boolean') return false;
		return null;
	}

}

export type AnyObject = {} | Record<string | number | symbol, unknown>;
export type SerializableValue = boolean | number | string | AnyObject;

export interface SchemaEntryOptions {
	array?: boolean;
	configurable?: boolean;
	default?: SerializableValue;
	filter?: SchemaEntryFilterFunction;
	inclusive?: boolean;
	maximum?: number;
	minimum?: number;
	resolve?: boolean;
}

export interface SchemaEntryEditOptions extends SchemaEntryOptions {
	type?: string;
}

export interface SchemaEntryJson extends Required<Omit<SchemaEntryEditOptions, 'filter'>> { }

export interface SchemaEntryFilterFunction {
	(client: Client, value: unknown, schemaEntry: SchemaEntry, language: Language): boolean;
}
