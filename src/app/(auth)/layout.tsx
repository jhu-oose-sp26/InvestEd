import { PaperTradingAuthProvider } from "@/contexts/PaperTradingAuthContext"
import { AuthRedirectWhenSignedIn } from "@/components/auth/AuthRedirectWhenSignedIn"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PaperTradingAuthProvider>
      <AuthRedirectWhenSignedIn />
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
        {children}
      </div>
    </PaperTradingAuthProvider>
  )
}
