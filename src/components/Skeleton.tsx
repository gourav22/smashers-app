// Skeleton loading components

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-6 w-32 rounded"></div>
        <div className="skeleton h-8 w-8 rounded-full"></div>
      </div>
      <div className="space-y-3">
        <div className="skeleton h-10 w-40 rounded"></div>
        <div className="skeleton h-4 w-24 rounded"></div>
        <div className="skeleton h-2 w-full rounded-full"></div>
        <div className="skeleton h-4 w-32 rounded"></div>
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="skeleton h-4 w-48 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg animate-pulse">
      <div className="skeleton h-12 w-12 rounded-full"></div>
      <div className="flex-1 space-y-2">
        <div className="skeleton h-5 w-32 rounded"></div>
        <div className="skeleton h-4 w-48 rounded"></div>
      </div>
      <div className="skeleton h-8 w-20 rounded"></div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
      <div className="skeleton h-6 w-40 rounded mb-4"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="skeleton h-8 w-16 rounded mb-2"></div>
            <div className="skeleton h-4 w-24 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-pulse">
      <div className="skeleton h-12 w-full"></div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="skeleton h-4 w-8 rounded"></div>
          <div className="skeleton h-10 w-10 rounded-full"></div>
          <div className="flex-1">
            <div className="skeleton h-5 w-32 rounded mb-2"></div>
            <div className="skeleton h-4 w-24 rounded"></div>
          </div>
          <div className="skeleton h-8 w-20 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonSlot() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition animate-pulse">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-8 w-8 rounded"></div>
          <div className="skeleton h-6 w-20 rounded-full"></div>
        </div>
        <div className="skeleton h-6 w-32 rounded mb-2"></div>
        <div className="skeleton h-5 w-40 rounded mb-1"></div>
        <div className="skeleton h-5 w-24 rounded mb-3"></div>
        <div className="skeleton h-4 w-36 rounded mb-4"></div>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <div className="skeleton h-4 w-16 rounded"></div>
            <div className="skeleton h-4 w-12 rounded"></div>
          </div>
          <div className="skeleton h-2 w-full rounded-full"></div>
        </div>
        <div className="skeleton h-10 w-full rounded-lg"></div>
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header skeleton */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="skeleton h-8 w-48 rounded"></div>
            <div className="flex gap-4">
              <div className="skeleton h-6 w-20 rounded"></div>
              <div className="skeleton h-6 w-16 rounded"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner skeleton */}
        <div className="skeleton h-32 w-full rounded-lg mb-8"></div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Stats skeleton */}
        <SkeletonStats />
      </main>
    </div>
  );
}

export function SkeletonLeaderboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="skeleton h-8 w-40 rounded"></div>
            <div className="skeleton h-6 w-24 rounded"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-2 mb-6">
          <div className="skeleton h-10 w-32 rounded-lg"></div>
          <div className="skeleton h-10 w-32 rounded-lg"></div>
        </div>

        <SkeletonTable />
      </main>
    </div>
  );
}

export function SkeletonSlots() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="skeleton h-8 w-40 rounded"></div>
            <div className="skeleton h-6 w-32 rounded"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="skeleton h-24 w-full rounded-lg mb-6"></div>

        <div className="flex gap-2 mb-6">
          <div className="skeleton h-10 w-28 rounded-lg"></div>
          <div className="skeleton h-10 w-32 rounded-lg"></div>
          <div className="skeleton h-10 w-28 rounded-lg"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonSlot key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
