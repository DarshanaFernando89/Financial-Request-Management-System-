export async function sendEmailNotification(_to: string, _subject: string, _message: string) {
  return { queued: false, reason: 'Email notifications are disabled in this MVP stub.' };
}
