export async function sendSmsNotification(_to: string, _message: string) {
  return { queued: false, reason: 'SMS notifications are disabled in this MVP stub.' };
}
