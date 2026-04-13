"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function SkeletonChart() {
  return (
    <Card className="px-4 lg:px-6 py-6 border-none shadow-none bg-transparent">
      <CardHeader className="p-0 mb-6">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-10 w-64" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-end gap-2 h-[300px] w-full pt-10">
          {[...Array(12)].map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1 rounded-t-lg" 
              style={{ height: `${Math.floor(Math.random() * 60) + 20}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
