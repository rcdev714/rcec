import type { Metadata } from "next";
import JobDetailPage from "@/components/job-detail-page";

interface PageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { jobId } = await params;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/jobs/${jobId}`);
    if (response.ok) {
      const job = await response.json();
      return {
        title: `${job.title} | Carreras | Camella`,
        description: job.description.substring(0, 160),
      };
    }
  } catch (error) {
    console.error('Error fetching job metadata:', error);
  }

  return {
    title: "Posición | Carreras | Camella",
    description: "Únete a nuestro equipo en Camella",
  };
}

export default async function JobPage({ params }: PageProps) {
  const { jobId } = await params;

  return <JobDetailPage jobId={jobId} />;
}
