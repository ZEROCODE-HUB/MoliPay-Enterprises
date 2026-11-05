import { Link } from "@tanstack/react-router";

export function BackToLoginLink() {
  return (
    <div className="pt-4 text-center">
      <Link
        to="/login"
        search={{ register: undefined }}
        className="text-xs text-black-400 underline underline-offset-2 hover:text-red-500"
      >
        Volver a inicio de sesión
      </Link>
    </div>
  );
}
