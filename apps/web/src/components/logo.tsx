import Link from "next/link";

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="Quilt Pattern Preflight home">
      <span className="logo-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        Quilt Pattern
        <strong>Preflight</strong>
      </span>
    </Link>
  );
}
