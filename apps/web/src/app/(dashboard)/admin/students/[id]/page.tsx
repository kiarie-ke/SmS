import { StudentDetailView } from './student-detail';

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentDetailView id={id} />;
}
