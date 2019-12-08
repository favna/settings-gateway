import { Serializer, SerializableValue, SerializerStore } from '../../dist';

export class MockObjectSerializer extends Serializer {

	public constructor(store: SerializerStore, file: string[], directory: string) {
		super(store, file, directory, { name: 'object' });
	}

	public resolve(data: SerializableValue): unknown {
		return data === null ? null : { data };
	}

}
