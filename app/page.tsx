import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-5 bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 dark:from-blue-950 dark:via-gray-950 dark:to-blue-900">
      <div className="flex flex-col gap-8 items-center text-center">
        <h1 className="text-5xl font-bold">
          Bienvenido a Unibrokers
        </h1>
        <h2 className="text-2xl font-bold">
          Sistema de análisis de empresariales del Ecuador
        </h2>
        <p className="text-lg text-gray-500 max-w-xl">
          Unibrokers es una empresa de seguros que ofrece soluciones de seguros para empresas y personas.
        </p>
        <Link
          href="/companies"
          className="px-6 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          View Companies
        </Link>
      </div>
    </main>
  );
}
