export function isRsoCollectionEnabled(value: string | undefined): boolean {
  return value?.trim().toLocaleLowerCase("en-US") === "true";
}
