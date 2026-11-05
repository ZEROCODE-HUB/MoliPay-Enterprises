export type SessionStatus = "loading" | "authenticated" | "anonymous";

export type SessionUser = { id: string; email: string | null };

export type PersonType = "individual" | "company";

/** Quien usa la cuenta: su titular o un usuario invitado al equipo de la empresa. */
export type TeamRole = "owner" | "admin" | "operator" | "viewer";

/** Cliente (empresa o persona) de la sesion. `legajo` es la identidad del cliente activo. */
export type CurrentCustomer = {
  legajo: string;
  name: string;
  /** Nombre de fantasia si tiene; si no, el nombre. */
  displayName: string;
  email: string;
  personType: PersonType;
  /** CUIT (o CUIL de persona fisica). */
  cuit: string;
  cbu: string | null;
  alias: string | null;
  teamRole: TeamRole;
};
