import { Project } from "@/lib/stores/store";
import { ProjectDetailClient } from "./project-detail-client";

interface ProjectDetailViewProps {
  project: Project;
}

export default function ProjectDetailView({ project }: ProjectDetailViewProps) {
  return <ProjectDetailClient project={project} />;
}
