"use client";

import { AutoSaveBadge } from "@/components/AutoSaveBadge";
import type { ReflectionActivity, ReflectionActivityPair } from "@/lib/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ReflectionActivityFormProps {
  activities: ReflectionActivity[];
  pairs: ReflectionActivityPair[];
  onActivitiesChange: (activities: ReflectionActivity[]) => void;
  onPairsChange: (pairs: ReflectionActivityPair[]) => void;
  saveStatus?: SaveStatus;
  isLoggedIn?: boolean;
}

function ensureActivityPair(pairs: ReflectionActivityPair[], activityKey: string): ReflectionActivityPair[] {
  if (pairs.some((p) => p.activityKey === activityKey)) return pairs;
  return [...pairs, { activityKey, ask: "", guess: "" }];
}

export function ReflectionActivityForm({
  activities,
  pairs,
  onActivitiesChange,
  onPairsChange,
  saveStatus = "idle",
  isLoggedIn = false,
}: ReflectionActivityFormProps) {
  function toggleActivity(index: number) {
    const activity = activities[index];
    const willCheck = !activity.checked;

    const nextActivities = [...activities];
    nextActivities[index] = { ...activity, checked: willCheck };
    onActivitiesChange(nextActivities);

    if (willCheck) {
      onPairsChange(ensureActivityPair(pairs, activity.key));
    }
  }

  function updatePair(index: number, field: "ask" | "guess", value: string) {
    const next = [...pairs];
    next[index] = { ...next[index], [field]: value };
    onPairsChange(next);
  }

  const checkedActivityRows = activities
    .filter((a) => a.checked)
    .map((activity) => {
      const pairIndex = pairs.findIndex((p) => p.activityKey === activity.key);
      return { activity, pairIndex };
    })
    .filter((row) => row.pairIndex >= 0);

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {activities.map((activity, i) => (
          <li key={activity.key}>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-koala-text">
              <input
                type="checkbox"
                checked={activity.checked}
                onChange={() => toggleActivity(i)}
                className="mt-0.5 size-4 shrink-0 rounded border-koala-secondary accent-koala-primary"
              />
              <span>{activity.label}</span>
            </label>
          </li>
        ))}
      </ul>

      {checkedActivityRows.length > 0 && (
        <div className="koala-card relative space-y-3 p-5 pt-8">
          <AutoSaveBadge
            status={saveStatus}
            isLoggedIn={isLoggedIn}
            className="absolute right-4 top-4"
          />
          <div className="hidden gap-3 sm:grid sm:grid-cols-[minmax(0,1.1fr)_1fr_1fr]">
            <span />
            <span className="koala-label text-center">질문하기</span>
            <span className="koala-label text-center">짐작하기</span>
          </div>

          {checkedActivityRows.map(({ activity, pairIndex }) => (
            <div
              key={activity.key}
              className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_1fr_1fr] sm:items-start"
            >
              <p className="text-sm leading-snug text-koala-primary sm:pt-2">{activity.label}</p>
              <div>
                <span className="koala-label mb-1 block sm:hidden">질문하기</span>
                <textarea
                  className="koala-input min-h-[80px]"
                  value={pairs[pairIndex].ask}
                  onChange={(e) => updatePair(pairIndex, "ask", e.target.value)}
                  placeholder="질문을 적어 보세요"
                />
              </div>
              <div>
                <span className="koala-label mb-1 block sm:hidden">짐작하기</span>
                <textarea
                  className="koala-input min-h-[80px]"
                  value={pairs[pairIndex].guess}
                  onChange={(e) => updatePair(pairIndex, "guess", e.target.value)}
                  placeholder="짐작을 적어 보세요"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
