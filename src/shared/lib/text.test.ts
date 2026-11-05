import { describe,expect,it } from "vitest";
import { onlyDigits } from "./text";

describe("onlyDigits", () => {
  it("quita guiones, espacios y letras", () => {
    expect(onlyDigits("20-12345678-9")).toBe("20123456789");
    expect(onlyDigits(" CVU 0000 0031 ")).toBe("00000031");
  });

  it("sin valor devuelve un texto vacio", () => {
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits(undefined)).toBe("");
  });
});
