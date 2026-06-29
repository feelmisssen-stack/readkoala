import { validateContent, type ContentFilterResult } from "@/lib/content-filter";

export function warnIfInvalidContent(...texts: string[]): ContentFilterResult {
  const check = validateContent(texts);
  if (!check.ok && check.message) {
    window.alert(check.message);
  }
  return check;
}

export function warnIfInvalidNickname(text: string): ContentFilterResult {
  const check = validateContent(text, { allowPersonalName: true });
  if (!check.ok && check.message) {
    window.alert(check.message);
  }
  return check;
}

export function alertContentFilterApiError(res: Response, data: { error?: string }): boolean {
  if (res.ok || !data.error) return false;
  window.alert(data.error);
  return true;
}
