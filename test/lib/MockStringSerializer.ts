import { Serializer, SerializableValue, SerializerStore, SerializerUpdateContext } from '../../dist';

export class MockStringSerializer extends Serializer {

	public constructor(store: SerializerStore, file: string[], directory: string) {
		super(store, file, directory, { name: 'string' });
	}

	public deserialize(data: SerializableValue): string {
		return String(data);
	}

	public resolve(data: SerializableValue, { entry, language }: SerializerUpdateContext): string | null {
		const parsed = String(data);
		return Serializer.minOrMax(parsed.length, entry, language) ? parsed : null;
	}

}
