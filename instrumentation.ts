import { validateStartup } from './src/lib/startup-validation'
import { registerShutdownHandlers } from './src/lib/shutdown'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Register graceful shutdown handlers
    registerShutdownHandlers()

    // Run startup validation
    await validateStartup()
  }
}
