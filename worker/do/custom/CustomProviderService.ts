import {
	type TLAiChange,
	type TLAiResult,
	type TLAiSerializedPrompt,
} from '../../../src/ai'
import { TldrawAiBaseService } from '../../TldrawAiBaseService'
import { Environment } from '../../types'

export class CustomProviderService extends TldrawAiBaseService {
	constructor(env: Environment) {
		super(env)
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async generate(prompt: TLAiSerializedPrompt): Promise<TLAiResult> {
		// todo: generate changes based on the prompt and return them all at once
		return { changes: [] }
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async *stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAiChange> {
		// todo: generate changes one-by-one based on the prompt and stream them back
		const changes: TLAiChange[] = []
		for (const change of changes) {
			yield change
		}
	}
}
