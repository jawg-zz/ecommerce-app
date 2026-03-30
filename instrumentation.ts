import { validateStartup } from './src/lib/startup-validation'
import { registerShutdownHandlers } from './src/lib/shutdown'
import { redis, connectRedis } from './src/lib/redis'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Register graceful shutdown handlers
    registerShutdownHandlers()

    // Initialize Redis connection
    await connectRedis()

    // Run startup validation
    await validateStartup()
  }
}
