import { useMemo } from 'react'
import {
	TldrawAiModule,
	type TldrawAiModuleOptions,
} from './src/TldrawAiModule'

/** @public */
export function useTldrawAiModule(options: TldrawAiModuleOptions) {
	const ai = useMemo(() => new TldrawAiModule(options), [options])
	return ai
}
