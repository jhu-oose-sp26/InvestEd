import Link from 'next/link'
import { PaperTradingSignInCard } from '@/components/auth/PaperTradingSignInCard'

export default function AuthLoginPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Account Login</h1>
      </div>
      <PaperTradingSignInCard />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="font-medium text-primary underline underline-offset-4 hover:opacity-90"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
