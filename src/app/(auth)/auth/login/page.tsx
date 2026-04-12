import { PaperTradingSignInCard } from '@/components/auth/PaperTradingSignInCard'

export default function AuthLoginPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Account Login</h1>
      </div>
      <PaperTradingSignInCard />
    </div>
  )
}
