export function formatNigerianPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("234")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    return `+234${digits.slice(1)}`;
  }

  return `+234${digits}`;
}

export function toTermiiPhoneNumber(value: string) {
  return formatNigerianPhoneNumber(value).replace(/^\+/, "");
}
