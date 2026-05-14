export const sendOTP = async (email: string, otp: string): Promise<boolean> => {
  console.log(`\n=================================================`);
  console.log(`[MOCK EMAIL TRANSPORTER] Sent to: ${email}`);
  console.log(`[MOCK EMAIL TRANSPORTER] Your Secure OTP: ${otp}`);
  console.log(`=================================================\n`);
  return true;
};
