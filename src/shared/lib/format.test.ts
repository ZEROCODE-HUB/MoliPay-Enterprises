import { describe,expect,it } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("formatea con separador de miles y dos decimales", () => {
    expect(formatMoney(1234.5)).toBe("$ 1.234,50");
    expect(formatMoney(0)).toBe("$ 0,00");
  });

  it("sin valor muestra un guion", () => {
    expect(formatMoney(null)).toBe("—");
  });
});
