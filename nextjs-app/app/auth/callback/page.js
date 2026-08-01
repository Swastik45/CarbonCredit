import CallbackClient from './CallbackClient';

export const dynamic = 'force-dynamic';

export default function CallbackPage({ searchParams }) {
  return <CallbackClient searchParams={searchParams} />;
}
