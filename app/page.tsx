import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-5">
      <div className="flex flex-col gap-8 items-center text-center">
        <h1 className="text-5xl font-bold">
          Welcome to Unibrokers
        </h1>
        <p className="text-lg text-gray-500 max-w-xl">
          Your trusted partner for insurance solutions.
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
