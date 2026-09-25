// Polish counts three ways and the forms are irregular, so they are GIVEN
// rather than derived: 1 dokument / 2 dokumenty / 5 dokumentów, but
// 1 ogłoszenie / 2 ogłoszenia / 5 ogłoszeń. Deriving the second from the first
// is a grammar engine nobody here needs.

/** `[mianownik, 2–4, 5+]`, e.g. `["ogłoszenie", "ogłoszenia", "ogłoszeń"]`. */
export type CountForms = [string, string, string];

/** "1 ogłoszenie", "3 ogłoszenia", "8 ogłoszeń", "22 ogłoszenia", "12 ogłoszeń". */
export function counted(n: number, [one, few, many]: CountForms): string {
  if (n === 1) return `1 ${one}`;
  const ten = n % 10;
  const hundred = n % 100;
  const isFew = ten >= 2 && ten <= 4 && (hundred < 10 || hundred >= 20);
  return `${n} ${isFew ? few : many}`;
}
