/**
 * 4직업 — chars.json 의 `job`, 장비(equip)의 `jobs`(무기·룬 등)와 같은 값을 씁니다.
 * 데이터는 저장소에 직접 추가하면 됩니다.
 */

export const JOB_IDS = ["knight", "archer", "mage", "healer"] as const;
export type JobId = (typeof JOB_IDS)[number];

export const JOB_LABELS: Record<JobId, string> = {
  knight: "기사",
  archer: "사수",
  mage: "마법사",
  healer: "힐러"
};

export function isJobId(value: unknown): value is JobId {
  return typeof value === "string" && (JOB_IDS as readonly string[]).includes(value);
}

/**
 * 장비 착용 가능 여부(무기·룬 등 `jobs` 가 있는 항목).
 * - `jobs` 가 없거나 빈 배열이면 전 직업 허용(기존 데이터 호환).
 * - 슬롯 캐릭터에 `job` 이 없으면 제한 없음(직업 데이터 넣기 전).
 */
export function weaponMatchesCharacterJob(
  item: { jobs?: JobId[] },
  characterJob: JobId | undefined | null
): boolean {
  const jobs = item.jobs;
  if (!jobs || jobs.length === 0) return true;
  if (characterJob == null || characterJob === undefined) return true;
  return jobs.includes(characterJob);
}
