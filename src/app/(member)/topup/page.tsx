import Link from 'next/link';

export default function TopUpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Top Up Balance</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow p-8 border border-gray-100">
          <div className="text-4xl mb-4">Info</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact Group Admin</h2>
          <p className="text-gray-600 mb-6">
            For balance top-up, please contact your group admin. They will update your account balance.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Home
            </Link>
            <Link
              href="/bookings"
              className="inline-flex items-center justify-center bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              View Bookings
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}