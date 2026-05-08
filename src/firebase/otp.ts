import { app } from "./firebaseConfig.ts";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// Add window interface for reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: any;
  }
}

const auth = getAuth(app);

// STEP 1: setup reCAPTCHA
export const setupRecaptcha = () => {
  if (window.recaptchaVerifier) return;
  
  const container = document.getElementById("recaptcha-container");
  if (!container) {
    console.warn("recaptcha-container not found in DOM");
    return;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "invisible", // or "normal"
    }
  );
};

// STEP 2: send OTP
export const sendOTP = async (phoneNumber: string) => {
  try {
    // Ensure recaptcha is set up
    if (!window.recaptchaVerifier) {
      setupRecaptcha();
    }

    const appVerifier = window.recaptchaVerifier;
    if (!appVerifier) {
      throw new Error("reCAPTCHA verifier not initialized. Make sure 'recaptcha-container' exists in the DOM.");
    }

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      appVerifier
    );

    window.confirmationResult = confirmationResult;
    console.log("OTP sent successfully to", phoneNumber);
    return confirmationResult;
  } catch (err) {
    console.error("Error sending OTP:", err);
    throw err;
  }
};

// STEP 3: verify OTP
export const verifyOTP = async (otp: string) => {
  try {
    if (!window.confirmationResult) {
      throw new Error("No confirmation result found. Call sendOTP first.");
    }
    const result = await window.confirmationResult.confirm(otp);
    console.log("User verified:", result.user);
    return result.user;
  } catch (err) {
    console.error("Invalid OTP", err);
    throw err;
  }
};