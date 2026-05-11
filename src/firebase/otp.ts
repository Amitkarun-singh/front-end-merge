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
  const container = document.getElementById("recaptcha-container");
  if (!container) {
    console.warn("recaptcha-container not found in DOM");
    return;
  }

  // If we already have a verifier, try to clear it to avoid "element removed" errors
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn("Error clearing old reCAPTCHA verifier", e);
    }
  }

  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    container,
    {
      size: "invisible", // or "normal"
      callback: (response: any) => {
        // reCAPTCHA solved - will proceed with phone auth
        console.log("reCAPTCHA solved");
      },
      "expired-callback": () => {
        // Response expired. Ask user to solve reCAPTCHA again.
        console.log("reCAPTCHA expired");
      }
    }
  );
};

// STEP 2: send OTP
export const sendOTP = async (phoneNumber: string) => {
  try {
    // Always setup a fresh recaptcha verifier to avoid stale element issues
    setupRecaptcha();

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
  } catch (err: any) {
    console.error("Error sending OTP:", err);
    
    // If we get a reCAPTCHA error, clear the verifier so it can be re-initialized next time
    if (err.message && err.message.includes("reCAPTCHA")) {
      console.log("Resetting reCAPTCHA due to error...");
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = null as any;
      }
    }
    
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