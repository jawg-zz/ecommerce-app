import { startWorkers, stopWorkers } from './lib/workers'
import { logInfo } from './lib/logger'
import { setWorkerStopHandler, registerShutdownHandlers } from './lib/shutdown'

registerShutdownHandlers()

async function main() {
  logInfo('Starting worker process...')
  
  await startWorkers()
  
  await setWorkerStopHandler(stopWorkers)
  
  logInfo('Worker process ready')
}

main().catch((error) => {
  console.error('Worker failed to start:', error)
  process.exit(1)
})