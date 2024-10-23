import Link from 'next/link'
import WardrobeManager from '@/components/WardrobeManager'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <WardrobeManager />
      <Link href="/debug" className="mt-8 text-blue-500 hover:underline">
        Debug View
      </Link>
    </main>
  )
}