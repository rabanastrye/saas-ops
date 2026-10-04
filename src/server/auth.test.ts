import { describe, expect, it } from "vitest";

import { isBasicAuthorized, isBearerAuthorized, safeEqual } from "./auth";

describe("safeEqual", () => {
  it("compara strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("isBearerAuthorized", () => {
  it("aceita só o segredo certo", () => {
    expect(isBearerAuthorized("Bearer s3cr3t", "s3cr3t")).toBe(true);
    expect(isBearerAuthorized("Bearer errado", "s3cr3t")).toBe(false);
    expect(isBearerAuthorized(null, "s3cr3t")).toBe(false);
  });

  it("recusa tudo sem segredo configurado", () => {
    expect(isBearerAuthorized("Bearer ", undefined)).toBe(false);
    expect(isBearerAuthorized("Bearer ", "")).toBe(false);
  });
});

describe("isBasicAuthorized", () => {
  const header = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`;

  it("aceita a senha certa com qualquer utilizador", () => {
    expect(isBasicAuthorized(header("jonas", "pw"), "pw")).toBe(true);
    expect(isBasicAuthorized(header("", "pw"), "pw")).toBe(true);
  });

  it("aceita senha com dois pontos", () => {
    expect(isBasicAuthorized(header("u", "a:b"), "a:b")).toBe(true);
  });

  it("recusa senha errada, header inválido ou senha não configurada", () => {
    expect(isBasicAuthorized(header("u", "x"), "pw")).toBe(false);
    expect(isBasicAuthorized("Basic !!!", "pw")).toBe(false);
    expect(isBasicAuthorized(header("u", ""), undefined)).toBe(false);
    expect(isBasicAuthorized(null, "pw")).toBe(false);
  });
});
