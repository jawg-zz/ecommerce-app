export function sendSSEMessage(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`
}
