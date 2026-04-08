import ConfirmClient from './ConfirmClient';

export const dynamic = 'force-dynamic';

export default function ConfirmPage({ searchParams }) {
  return <ConfirmClient searchParams={searchParams} />;
}
