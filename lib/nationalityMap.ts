import { NATIONALITY_OPTIONS } from "./countries";

export const NATIONALITY_TO_COUNTRY_CODE: Record<string, string> = {
  Pakistani: "PK",
  Afghan: "AF",
  Bangladeshi: "BD",
  Chinese: "CN",
  Indian: "IN",
  Iranian: "IR",
  "Sri Lankan": "LK",
};

export const COUNTRY_CODE_TO_NATIONALITY: Record<string, string> =
  Object.entries(NATIONALITY_TO_COUNTRY_CODE).reduce(
    (acc, [nationality, code]) => ({ ...acc, [code]: nationality }),
    {} as Record<string, string>,
  );
