import { createFileRoute } from "@tanstack/react-router";
import ogImageSrc from "@/assets/miniaturafinal.png";
import { LandingPage } from "@/features/landing/components/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MoliPay — Soluciones financieras digitales" },
      {
        name: "description",
        content:
          "MoliPay integra pagos, cobros y remesas para empresas y particulares en América Latina. Plataforma regulada bajo marco normativo BCRA.",
      },
      { property: "og:title", content: "MoliPay — Soluciones financieras digitales" },
      {
        property: "og:description",
        content:
          "Cuenta de pago, Crossborder, CVU Collect y Billetera. Plataforma tecnológica escalable y regulada.",
      },
      { property: "og:image", content: ogImageSrc },
      { property: "og:image:width", content: "1901" },
      { property: "og:image:height", content: "904" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImageSrc },
    ],
  }),
  component: LandingPage,
});
