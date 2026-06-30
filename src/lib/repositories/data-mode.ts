import { isFirebaseAuthEnabled } from "@/lib/firebase/config";

export function isFirestoreDataEnabled(): boolean {
  return isFirebaseAuthEnabled();
}

export function serializeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
