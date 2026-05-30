import type { VrmHook } from './hooks'

import { createVrmOutlineHook } from './outline'

function resolveInternalVrmHooks(): readonly VrmHook[] {
  return [
    createVrmOutlineHook(),
  ]
}
