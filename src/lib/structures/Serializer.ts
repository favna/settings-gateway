import { AliasPiece, Language, constants, MentionRegex } from 'klasa';
import { SerializableValue } from '../types';
import { SchemaEntry } from '../schema/SchemaEntry';
import { Guild } from 'discord.js';

export abstract class Serializer extends AliasPiece {

	/**
	 * The serialize method to be overwritten in actual Serializers.
	 * @param data The data to serialize
	 */
	public serialize(data: unknown): SerializableValue {
		return data as SerializableValue;
	}

	/**
	 * The deserialize method to be overwritten in actual Serializers.
	 * @param data The data to deserialize
	 * @param entry The SchemaEntry we are deserializing for.
	 * @param language The language to use when responding.
	 * @param guild The guild that will help deserialize
	 */
	public abstract deserialize(data: SerializableValue, entry: SchemaEntry, language: Language, guild: Guild | null): Promise<unknown>;

	/**
	 * The stringify method to be overwritten in actual Serializers
	 * @param data The data to stringify
	 */
	public stringify(data: SerializableValue): string {
		return String(data);
	}

	/**
	 * Check the boundaries of a key's minimum or maximum.
	 * @param value The value to check
	 * @param entry The schema entry that manages the key
	 * @param language The language that is used for this context
	 */
	protected static minOrMax(value: number, { minimum, maximum, inclusive, key }: SchemaEntry, language: Language): boolean {
		if (minimum && maximum) {
			if ((value >= minimum && value <= maximum && inclusive) || (value > minimum && value < maximum && !inclusive)) return true;
			if (minimum === maximum) throw language.get('RESOLVER_MINMAX_EXACTLY', key, minimum, inclusive);
			throw language.get('RESOLVER_MINMAX_BOTH', key, minimum, maximum, inclusive);
		} else if (minimum) {
			if ((value >= minimum && inclusive) || (value > minimum && !inclusive)) return true;
			throw language.get('RESOLVER_MINMAX_MIN', key, minimum, inclusive);
		} else if (maximum) {
			if ((value <= maximum && inclusive) || (value < maximum && !inclusive)) return true;
			throw language.get('RESOLVER_MINMAX_MAX', key, maximum, inclusive);
		}
		return true;
	}

	/**
	* Standard regular expressions for matching mentions and snowflake ids
	*/
	protected static regex: MentionRegex = constants.MENTION_REGEX;

}
