import { PaperTradingRegisterCard } from '@/components/auth/PaperTradingRegisterCard'

export default function AuthRegisterPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
      </div>
      <PaperTradingRegisterCard />
    </div>
  )
}
