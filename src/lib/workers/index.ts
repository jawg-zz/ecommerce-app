import { paymentCheckWorker } from './payment-check'
import { logInfo, logError } from '@/lib/logger'

export async function startWorkers(): Promise<void> {
  logInfo('Starting BullMQ workers...')
  
  paymentCheckWorker.on('error', (error) => {
    logError('Payment check worker error', { error: error.message })
  })

  logInfo('Workers started successfully')
}

export async function stopWorkers(): Promise<void> {
  logInfo('Stopping BullMQ workers...')
  
  await paymentCheckWorker.close()
  
  logInfo('Workers stopped successfully')
}