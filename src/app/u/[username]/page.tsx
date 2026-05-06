import PublicProfileClient from '@/components/dashboard/PublicProfileClient'
export default function PublicProfilePage({ params }: { params: { username: string } }) {
  return <PublicProfileClient userId={params.username} />
}
