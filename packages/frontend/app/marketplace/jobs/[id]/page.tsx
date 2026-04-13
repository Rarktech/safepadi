import { JobDetails } from "@/components/marketplace/JobDetails";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Job Details | Safeeely Marketplace",
    description: "View verified job and service listings protected by Safeeely AI escrow.",
};

export default function JobPage({ params }: { params: { id: string } }) {
    // In the future, this is where we will fetch the specific job details using params.id
    return <JobDetails id={params.id} jobData={null} />;
}
