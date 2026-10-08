import i18n from "./index.js";

// Store message keys in transient state so notices also follow language changes.
export function translateMessage(message) {
  if (!message || typeof message === "string") return message;
  const values = Object.fromEntries(
    Object.entries(message.values || {}).map(([key, value]) => [
      key,
      value && typeof value === "object" && "key" in value
        ? translateMessage(value)
        : value,
    ]),
  );
  return i18n.t(message.key, values);
}
