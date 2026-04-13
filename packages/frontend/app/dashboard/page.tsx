"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SkeletonCards } from "@/components/skeletons/SkeletonCards";
import { SkeletonChart } from "@/components/skeletons/SkeletonChart";
import { SkeletonTable } from "@/components/skeletons/SkeletonTable";

import data from "./data.json"

export default function Page() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Premium loading buffer
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className={`flex flex-col gap-4 py-4 md:gap-6 md:py-6 transition-opacity duration-700 ${isLoading ? 'opacity-100' : 'opacity-100'}`}>
              {isLoading ? (
                <>
                  <SkeletonCards />
                  <div className="px-4 lg:px-6">
                    <SkeletonChart />
                  </div>
                  <SkeletonTable />
                </>
              ) : (
                <div className="animate-in fade-in duration-700">
                  <SectionCards />
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive />
                  </div>
                  <DataTable data={data} />
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
