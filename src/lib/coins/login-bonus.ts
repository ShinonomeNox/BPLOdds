import { isMatchDay } from "@/lib/date/match-day";

export const LOGIN_BONUS_COINS = 500;
export const LOGIN_BONUS_COINS_MATCH_DAY = 3000;

export function getLoginBonusAmount(): number {
  return isMatchDay() ? LOGIN_BONUS_COINS_MATCH_DAY : LOGIN_BONUS_COINS;
}
