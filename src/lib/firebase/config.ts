export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function readEnv(name: string): string {
  const value = process.env[name] ?? "";
  return value.trim().replace(/^"|"$/g, "");
}

/** Server routes: runtime env (avoids build-time inlining of NEXT_PUBLIC_*). */
export function getServerFirebaseApiKey(): string {
  const dynamicKey = "NEXT_PUBLIC_" + "FIREBASE_API_KEY";
  return readEnv(dynamicKey);
}

export function getFirebaseClientConfig(): FirebaseClientConfig {
  return {
    apiKey: getServerFirebaseApiKey(),
    authDomain: readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };
}

export function isFirebaseClientConfigured(): boolean {
  const config = getFirebaseClientConfig();
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId
  );
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
      (process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  );
}

export function isFirebaseAuthEnabled(): boolean {
  return isFirebaseClientConfigured() && isFirebaseAdminConfigured();
}
