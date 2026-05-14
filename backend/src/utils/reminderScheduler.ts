/**
 * reminderScheduler.ts
 *
 * Runs a cron job every minute. For each active reminder,
 * checks if the current HH:MM (in the reminder's timezone)
 * matches any of its scheduled times. If yes, logs the alert.
 *
 * In a production system, you would swap the console.log with
 * a push notification service (FCM, OneSignal, Twilio, etc.).
 */
import cron from 'node-cron';
import Reminder from '../models/Reminder';

export function startReminderScheduler() {
  // Runs every minute: "* * * * *"
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const reminders = await Reminder.find({ isActive: true });

      for (const reminder of reminders) {
        // Get current time in the reminder's timezone
        const localTime = now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: reminder.timezone || 'Asia/Kolkata',
        }); // Returns "HH:MM"

        if (reminder.times.includes(localTime)) {
          console.log(
            `🔔 [REMINDER ALERT] Patient ${reminder.patientId}: ` +
            `Take "${reminder.medicineName}" (${reminder.dosage}) at ${localTime}. ` +
            `${reminder.notes ? 'Note: ' + reminder.notes : ''}`
          );

          // ─────────────────────────────────────────────────────────────────
          // TODO: Replace the console.log above with a real notification call:
          //
          // Option 1 — Browser Push Notification via Web Push API:
          //   await sendWebPushNotification(reminder.patientId, {...})
          //
          // Option 2 — SMS via Twilio:
          //   await twilioClient.messages.create({ body: `Take ${reminder.medicineName}`, to: patientPhone })
          //
          // Option 3 — Email via Nodemailer:
          //   await transporter.sendMail({ to: patientEmail, subject: 'Medicine Reminder', text: ... })
          // ─────────────────────────────────────────────────────────────────
        }
      }
    } catch (err: any) {
      console.error('[ReminderScheduler] Error:', err.message);
    }
  });

  console.log('✅ Reminder scheduler started (checks every minute).');
}
