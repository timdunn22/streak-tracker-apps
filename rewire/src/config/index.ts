import type { AppConfig } from './types'
import { rewire } from './apps/rewire'
import { vapefree } from './apps/vapefree'
import { fasttrack } from './apps/fasttrack'
import { greenday } from './apps/greenday'
import { sugarfree } from './apps/sugarfree'
import { decaf } from './apps/decaf'
import { primal } from './apps/primal'
import { iceplunge } from './apps/iceplunge'
import { sober } from './apps/sober'
import { clearlungs } from './apps/clearlungs'

const configs: Record<string, AppConfig> = {
  rewire,
  vapefree,
  fasttrack,
  greenday,
  sugarfree,
  decaf,
  primal,
  iceplunge,
  sober,
  clearlungs,
}

const appId = import.meta.env.VITE_APP_ID || 'rewire'
export const config: AppConfig = configs[appId] || configs.rewire
export type { AppConfig } from './types'
