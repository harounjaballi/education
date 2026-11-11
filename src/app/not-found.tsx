import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-teal-600">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-navy-900">Page introuvable · الصفحة غير موجودة</h1>
        <Link href="/" className="btn-primary mt-6">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
