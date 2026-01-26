/**
 * Temporary Patient Session Management
 * Handles session data for patients who book appointments without being logged in
 */

export interface TempPatientSession {
  isTemporaryLogin: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loginTime: string;
}

/**
 * Save temporary patient session to storage
 */
export const saveTempPatientSession = (session: TempPatientSession): void => {
  try {
    const sessionData = JSON.stringify(session);
    localStorage.setItem("tempPatientSession", sessionData);
    sessionStorage.setItem("tempPatientSession", sessionData);
  } catch (error) {
    console.error("[TEMP SESSION] Error saving session:", error);
  }
};

/**
 * Get temporary patient session from storage
 */
export const getTempPatientSession = (): TempPatientSession | null => {
  try {
    // Try localStorage first (more persistent)
    const localData = localStorage.getItem("tempPatientSession");
    if (localData) {
      return JSON.parse(localData);
    }

    // Fallback to sessionStorage
    const sessionData = sessionStorage.getItem("tempPatientSession");
    if (sessionData) {
      return JSON.parse(sessionData);
    }

    return null;
  } catch (error) {
    console.error("[TEMP SESSION] Error retrieving session:", error);
    return null;
  }
};

/**
 * Clear temporary patient session
 */
export const clearTempPatientSession = (): void => {
  try {
    localStorage.removeItem("tempPatientSession");
    sessionStorage.removeItem("tempPatientSession");
  } catch (error) {
    console.error("[TEMP SESSION] Error clearing session:", error);
  }
};

/**
 * Check if current user is temporarily logged in
 */
export const isTemporarilyLoggedIn = (): boolean => {
  const session = getTempPatientSession();
  return session !== null && session.isTemporaryLogin === true;
};

/**
 * Get patient name from temporary session
 */
export const getTempPatientName = (): string => {
  const session = getTempPatientSession();
  if (session) {
    return `${session.firstName} ${session.lastName}`;
  }
  return "";
};

/**
 * Check if session has expired (optional: set to 24 hours)
 */
export const isSessionExpired = (): boolean => {
  const session = getTempPatientSession();
  if (!session) return true;

  try {
    const loginTime = new Date(session.loginTime);
    const currentTime = new Date();
    const hoursElapsed = (currentTime.getTime() - loginTime.getTime()) / (1000 * 60 * 60);

    // Expire session after 24 hours
    return hoursElapsed > 24;
  } catch (error) {
    console.error("[TEMP SESSION] Error checking expiration:", error);
    return true;
  }
};
