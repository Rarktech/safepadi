"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";

export function SkeletonCards() {
  return (
    <div className="@xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 lg:px-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="@container/card bg-gradient-to-t from-primary/5 to-card">
          <CardHeader className="relative">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-32" />
            <div className="absolute right-4 top-4">
              <Skeleton className="h-6 w-12 rounded-lg" />
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 p-6 pt-0">
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-3 w-48" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
