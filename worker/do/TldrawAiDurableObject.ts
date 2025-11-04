import { type TLAiResult, type TLAiSerializedPrompt } from '../../src/ai'
import { AutoRouter, error } from 'itty-router'
import { TldrawAiBaseService } from '../TldrawAiBaseService'
import { Environment } from '../types'
import { OpenAiService } from './openai/OpenAiService'
import {
	DurableObjectState,
	DurableObject,
	Request,
} from '@cloudflare/workers-types'

export class TldrawAiDurableObject implements DurableObject {
	ctx: DurableObjectState
	env: Environment
	service: TldrawAiBaseService

	constructor(ctx: DurableObjectState, env: Environment) {
		this.ctx = ctx
		this.env = env
		this.service = new OpenAiService(this.env) // swap this with your own service
	}

	private readonly router = AutoRouter({
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	})
		// when we get a connection request, we stash the room id if needed and handle the connection
		.post('/generate', (request: Request) => this.generate(request))
		.post('/stream', (request: Request) => this.stream(request))
		.post('/cancel', (request: Request) => this.cancel(request))

	// `fetch` is the entry point for all requests to the Durable Object
	fetch(request: Request) {
		return this.router.fetch(request)
	}

	/**
	 * Cancel the current stream.
	 *
	 * @param _request - The request object containing the prompt.
	 * @returns A Promise that resolves to a Response object containing the cancelled response.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	cancel(request: Request) {
		return new Response('Not implemented', {
			status: 501,
		})
	}

	/**
	 * Generate a set of changes from the model.
	 *
	 * @param request - The request object containing the prompt.
	 * @returns A Promise that resolves to a Response object containing the generated changes.
	 */
	private async generate(request: Request) {
		const prompt = (await request.json()) as TLAiSerializedPrompt

		try {
			const response = await this.service.generate(prompt)

			// Send back the response as a JSON object
			return new Response(JSON.stringify(response), {
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error: unknown) {
			console.error('AI response error:', error)
			return new Response('An internal server error occurred.', {
				status: 500,
			})
		}
	}

	/**
	 * Stream changes from the model.
	 *
	 * @param request - The request object containing the prompt.
	 * @returns A Promise that resolves to a Response object containing the streamed changes.
	 */
	private async stream(request: Request): Promise<Response> {
		const encoder = new TextEncoder()
		const { readable, writable } = new TransformStream()
		const writer = writable.getWriter()

		const response: TLAiResult = {
			changes: [],
		}

		;(async () => {
			try {
				const prompt = await request.json()

				for await (const change of this.service.stream(
					prompt as TLAiSerializedPrompt
				)) {
					response.changes.push(change)
					const data = `data: ${JSON.stringify(change)}\n\n`
					await writer.write(encoder.encode(data))
					await writer.ready
				}
				await writer.close()
			} catch (error) {
				console.error('Stream error:', error)
				await writer.abort(error)
			}
		})()

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
				'Transfer-Encoding': 'chunked',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		})
	}
}
