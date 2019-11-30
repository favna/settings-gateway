import { Serializer, SerializableValue, SchemaEntry, SerializerStore } from '../../dist';
import { Language } from 'klasa';

export class MockNumberSerializer extends Serializer {

	public constructor(store: SerializerStore, file: string[], directory: string) {
		super(store, file, directory, { name: 'number', aliases: ['integer', 'float'] });
	}

	public async deserialize(data: SerializableValue, entry: SchemaEntry, language: Language): Promise<number | null> {
		let parsed: number;
		switch (entry.type) {
			case 'integer':
				parsed = parseInt(data as string);
				if (Number.isInteger(parsed) && Serializer.minOrMax(parsed, entry, language)) return parsed;
				throw language.get('RESOLVER_INVALID_INT', entry.key);
			case 'number':
			case 'float':
				parsed = parseFloat(data as string);
				if (!isNaN(parsed) && Serializer.minOrMax(parsed, entry, language)) return parsed;
				throw language.get('RESOLVER_INVALID_FLOAT', entry.key);
		}
		// noop
		return null;
	}

}
