import { describe, expect, it } from "vitest";

import { resolverUrlDoSite } from "./url-site";

describe("resolverUrlDoSite", () => {
  it("usa NEXT_PUBLIC_SITE_URL quando definida (sem barra no fim)", () => {
    expect(
      resolverUrlDoSite({
        NEXT_PUBLIC_SITE_URL: " https://orcai.vercel.app/ ",
        NODE_ENV: "production",
      }),
    ).toBe("https://orcai.vercel.app");
    expect(
      resolverUrlDoSite({
        NEXT_PUBLIC_SITE_URL: "http://192.168.0.10:3000",
        NODE_ENV: "development",
      }),
    ).toBe("http://192.168.0.10:3000");
  });

  it("desenvolvimento sem a variável: http://localhost:3000", () => {
    expect(resolverUrlDoSite({ NODE_ENV: "development" })).toBe("http://localhost:3000");
    expect(resolverUrlDoSite({ NODE_ENV: "test", NEXT_PUBLIC_SITE_URL: "  " })).toBe(
      "http://localhost:3000",
    );
  });

  it("produção na Vercel sem a variável: domínio de produção do projeto", () => {
    expect(
      resolverUrlDoSite({
        NODE_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "orcai.vercel.app",
      }),
    ).toBe("https://orcai.vercel.app");
  });

  it("produção sem nada configurado: null (usa o endereço da requisição, nunca localhost)", () => {
    expect(resolverUrlDoSite({ NODE_ENV: "production" })).toBeNull();
  });
});
