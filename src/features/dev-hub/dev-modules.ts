import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type DevModule = {
  id: string;
  label: string;
  description: string;
  Component: LazyExoticComponent<ComponentType>;
};

/**
 * Secciones de /dev: cada una es un boton y un componente; agregar otra no requiere rutas.
 * Vacio fuera de desarrollo, para que este contenido no llegue al bundle de produccion.
 */
export const DEV_MODULES: DevModule[] = import.meta.env.DEV
  ? [
      {
        id: "onboarding",
        label: "Onboarding",
        description: "Arquitectura de personas físicas, jurídicas y KYC",
        Component: lazy(() => import("./modules/onboarding/onboarding-architecture")),
      },
    ]
  : [];
