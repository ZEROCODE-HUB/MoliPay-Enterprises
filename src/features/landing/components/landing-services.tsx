import { Check } from "lucide-react";
import { Eyebrow } from "./landing-parts";
import cuentaCvu from "@/assets/servicios/cuenta-cvu.jpg";
import cvuCollect from "@/assets/servicios/cvu-collect.jpg";
import consorcios from "@/assets/servicios/consorcios.jpg";
import linkDePago from "@/assets/servicios/link-de-pago.jpg";
import ecommerce from "@/assets/servicios/ecommerce.jpg";
import pagoServicios from "@/assets/servicios/pago-servicios.jpg";
import api from "@/assets/servicios/api.jpg";

export function LedgerStrip() {
  const items = [
    ["Entidad registrada", "MoliPay S.R.L."],
    ["Cobertura", "América Latina"],
    ["Compliance", "Marco normativo BCRA"],
    ["Plataforma", "100% digital"],
  ];
  return (
    <section className="bg-black-800 border-t border-white/10 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {items.map(([label, value], i) => (
            <div
              key={label}
              className={`py-3 md:py-7 px-2 md:px-6 ${i > 0 ? "border-l border-white/10" : ""}`}
            >
              <div className="font-sans text-xs font-medium text-red-400">{label}</div>
              <div className="mt-1 md:mt-2 font-sans text-[clamp(0.7rem,2.5vw,0.875rem)] tracking-wider text-white">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Las cards de servicios, tal cual las piezas de marca (ejemplos/02..09). */
const SERVICES = [
  {
    img: cuentaCvu,
    tag: "01 · Cuentas",
    title: ["Cuenta de Pago", "(CVU)"],
    lead: "Tu dinero, en movimiento las 24 horas.",
    body: "Una CVU propia para enviar y recibir transferencias inmediatas con cualquier banco o billetera virtual del país. Operá con agilidad, trazabilidad completa y el respaldo de una plataforma que cumple con la normativa del BCRA.",
    features: ["Transferencias 24/7", "Cualquier banco o billetera", "Normativa BCRA"],
  },
  {
    img: cvuCollect,
    tag: "02 · Cobranza",
    title: ["CVU", "Collect"],
    lead: "Una cuenta principal. Una CVU para cada cliente.",
    body: "Asigná subcuentas individuales a clientes, unidades o deudores y recibí todos los fondos centralizados en tu cuenta. Cada pago se identifica automáticamente: sabés quién pagó, cuánto y cuándo, sin conciliaciones manuales.",
    features: ["Una CVU por cliente", "Fondos centralizados", "Identificación automática"],
  },
  {
    img: consorcios,
    tag: "03 · Cobranza",
    title: ["Módulo de", "Recaudación"],
    lead: "Cobranza recurrente, cobrada y conciliada en un solo lugar.",
    body: "Emití, seguí y conciliá miles de cobros periódicos desde un único proceso. Ideal para administraciones de consorcios y alquileres, colegios, universidades y organizaciones que buscan reducir la morosidad, con múltiples canales de pago y reportería financiera desde un dashboard.",
    features: ["Miles de cobros, un proceso", "Múltiples canales de pago", "Menos morosidad"],
  },
  {
    img: linkDePago,
    tag: "04 · Cobros con tarjeta",
    title: ["Link", "de pago"],
    lead: "Cobrá con tarjeta por WhatsApp, email o redes.",
    body: "Generá un link en segundos y compartilo por el canal que prefieras. Tus clientes pagan con crédito o débito de forma simple y segura, sin terminal ni desarrollo.",
    features: ["Link listo en segundos", "Crédito y débito", "Sin terminal ni desarrollo"],
  },
  {
    img: ecommerce,
    tag: "05 · Ventas online",
    title: ["E-", "commerce"],
    lead: "Tu tienda online, lista para cobrar.",
    body: "Integrá un checkout seguro a tu sitio y ofrecé una experiencia de compra fluida. Todas tus ventas online, visibles y gestionadas desde un único panel.",
    features: ["Checkout seguro", "Compra fluida", "Un único panel de ventas"],
  },
  {
    img: pagoServicios,
    tag: "06 · Pagos",
    title: ["Pago de", "servicios"],
    lead: "Impuestos y servicios, sin salir de tu cuenta.",
    body: "Pagá impuestos, servicios y obligaciones directamente desde la plataforma, en pocos pasos.",
    features: ["Impuestos", "Servicios", "Obligaciones"],
  },
  {
    img: api,
    tag: "07 · Integración",
    title: ["API de", "integración"],
    lead: "Toda nuestra tecnología, dentro de tu plataforma.",
    body: "Conectá cuentas, cobros, recaudación y conciliación con tus sistemas, ecommerce, apps o billeteras. Documentación clara, entorno de pruebas y acompañamiento técnico en cada etapa de la implementación.",
    features: ["Documentación clara", "Entorno de pruebas", "Acompañamiento técnico"],
  },
];

// Azul de las piezas de marca (titulos y bajadas).
const BRAND_BLUE = "text-[#2F4BD8]";

export function Services() {
  return (
    <section id="servicios" className="border-t border-border bg-[#EEF1F8]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <Eyebrow tone="accent">Servicios</Eyebrow>
        <h2 className="mt-4 text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-[1.1] text-[#0B1437]">
          Nuestros servicios
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 md:mt-12 md:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((s) => (
            <article
              key={s.tag}
              className="group flex flex-col overflow-hidden rounded-xl bg-[#1A2C8F] shadow-[0_10px_30px_-20px_rgba(15,31,107,0.55)] transition-shadow hover:shadow-[0_16px_36px_-18px_rgba(15,31,107,0.6)]"
            >
              <img
                src={s.img}
                alt=""
                loading="lazy"
                className="aspect-[1100/666] w-full object-cover"
              />
              <div className="-mt-3 flex flex-1 flex-col rounded-t-xl bg-white px-5 pb-5 pt-4">
                <span className="inline-flex w-fit rounded-full bg-[#FFE4E8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#C2102A]">
                  {s.tag}
                </span>
                <h3 className="mt-2.5 text-2xl font-extrabold leading-tight tracking-tight text-[#0B1437]">
                  {s.title[0]}
                  {s.title[0].endsWith("-") ? "" : " "}
                  <span className={BRAND_BLUE}>{s.title[1]}</span>
                </h3>
                <p className={`mt-1.5 text-sm font-semibold leading-snug ${BRAND_BLUE}`}>
                  {s.lead}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#4A5578]">{s.body}</p>
                <ul className="mt-auto grid grid-cols-3 gap-2 pt-5">
                  {s.features.map((f, i) => (
                    <li
                      key={f}
                      className="flex min-w-0 items-center gap-1.5 rounded-md bg-[#F3F5FB] px-2 py-2 text-[11px] font-semibold leading-tight text-[#0B1437]"
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-[5px] text-white ${
                          i === 2 ? "bg-[#E8364F]" : "bg-[#2F4BD8]"
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
