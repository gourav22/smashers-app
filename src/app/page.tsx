import Link from 'next/link';
import { BOOKING_COST, formatCurrencyAmount } from '@/lib/config';

export default function Home() {
  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || 'Smashers Club';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            {clubName}
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            🏸 Badminton | 🏏 Cricket | 🎯 Track Your Progress
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-12">
            Book slots, play matches, and climb the leaderboard with our advanced ELO rating system.
            Separate rankings for each sport!
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              Get Started →
            </Link>
            <Link
              href="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">🎾</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Booking</h3>
            <p className="text-gray-600">
              Book slots with one click. See real-time availability and hot slots.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Your ELO</h3>
            <p className="text-gray-600">
              Separate rankings for badminton and cricket. Watch your progress with every match.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Compete & Win</h3>
            <p className="text-gray-600">
              Climb the leaderboard from Grade D to A. Track your win streaks and achievements.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-lg p-12 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Sign Up</h4>
              <p className="text-sm text-gray-600">Quick signup with Google, Facebook, or GitHub</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Top Up</h4>
              <p className="text-sm text-gray-600">Add balance to book slots (€{formatCurrencyAmount(BOOKING_COST)} per game)</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Play</h4>
              <p className="text-sm text-gray-600">Book slots and play matches</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Track</h4>
              <p className="text-sm text-gray-600">Record matches and see your ELO climb!</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join {clubName} and compete with the best!
          </p>
          <Link
            href="/register"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-4 rounded-lg text-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-xl"
          >
            Join Now - It's Free! 🚀
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>© 2026 {clubName}. Built with Next.js & Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
