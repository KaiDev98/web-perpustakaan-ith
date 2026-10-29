import { notFound } from 'next/navigation';
import PreviewDashboard from '../preview-dashboard';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({ params }) {
  if (process.env.NODE_ENV !== 'development' || process.env.ADMIN_PREVIEW_ENABLED !== 'true') notFound();
  const { role } = await params;
  if (role !== 'admin' && role !== 'superadmin') notFound();
  return <PreviewDashboard role={role} />;
}
