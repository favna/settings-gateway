import { Serializer, SerializableValue, SchemaEntry, SerializerStore } from '../../dist';
import { Language } from 'klasa';

export class MockStringSerializer extends Serializer {

	public constructor(store: SerializerStore, file: string[], directory: string) {
		super(store, file, directory, { name: 'string' });
	}

	public async deserialize(data: SerializableValue, entry: SchemaEntry, language: Language): Promise<string | null> {
		const parsed = String(data);
		return Serializer.minOrMax(parsed.length, entry, language) ? parsed : null;
	}

}
