import { Serializer, SerializableValue, SerializerStore, KeyedObject } from '../../dist';

export class MockObjectSerializer extends Serializer {

	public constructor(store: SerializerStore, file: string[], directory: string) {
		super(store, file, directory, { name: 'object' });
	}

	public deserialize(data: SerializableValue): KeyedObject {
		return data as KeyedObject;
	}

	public resolve(data: SerializableValue): KeyedObject | null {
		return data === null ? null : { data };
	}

}
