"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ProductSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden flex flex-col h-full w-full">
      {/* Image Header Placeholder */}
      <div className="p-4 pb-0 w-full">
        <Skeleton className="aspect-[16/11] w-full rounded-[24px]" />
      </div>

      {/* Card Content Placeholder */}
      <div className="p-6 pt-5 flex flex-col flex-1">
        {/* Price Placeholder */}
        <div className="flex flex-col items-end mb-4">
          <Skeleton className="h-7 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Title & Location Placeholder */}
        <div className="mb-6">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-50 w-full mb-6" />

        {/* Features Row Placeholder */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-2 w-10" />
            </div>
          </div>
          <div className="flex items-center gap-3 pl-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-8" />
            </div>
          </div>
        </div>

        {/* Button Placeholder */}
        <Skeleton className="w-full h-14 rounded-full mt-auto" />
      </div>
    </div>
  );
}
