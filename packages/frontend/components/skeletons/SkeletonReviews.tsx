"use client";

import { Skeleton } from "@/components/ui/skeleton";
import styles from "../app/reviews/[safetag]/reviews.module.css";

export function SkeletonReviews() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.logo}>
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-6 w-40 rounded-full" />
      </header>

      <main className={styles.main}>
        {/* Session Banner Skeleton */}
        <div className="mb-8 overflow-hidden rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Profile Hero Skeleton */}
        <section className={styles.heroSection}>
          <div className={styles.heroLeft}>
            <Skeleton className="h-[68px] w-[68px] rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-2 mt-2">
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-3 mb-2">
                <Skeleton className="h-3 w-4" />
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </section>

        {/* Reviews List Skeleton */}
        <section className={styles.reviewsSection}>
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>

          <div className={styles.reviewList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.reviewerInfo}>
                    <Skeleton className="h-[44px] w-[44px] rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <Skeleton className="h-6 w-16 rounded-lg" />
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
