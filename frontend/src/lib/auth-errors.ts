// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAuthErrorMessage = (error: any): string => {
  const code = (error?.code || error?.message || "").toLowerCase();
  
  if (code.includes("auth/user-not-found")) {
    return "User doesn't exist";
  }
  if (code.includes("auth/wrong-password") || code.includes("auth/invalid-credential")) {
    return "Wrong email id or password";
  }
  if (code.includes("auth/email-already-in-use")) {
    return "User already exists";
  }
  if (code.includes("auth/invalid-email")) {
    return "Please enter a valid email address";
  }
  if (code.includes("auth/weak-password")) {
    return "Password must contain at least 6 characters";
  }
  if (code.includes("auth/missing-email") || code.includes("auth/missing-password")) {
    return "Please fill all required fields";
  }
  
  return "An unexpected error occurred. Please try again.";
};
