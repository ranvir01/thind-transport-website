"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Truck, LogIn } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4bd64d0b-61fc-4eff-91ed-d2f6838af806',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:handleSubmit',message:'Login attempt started',data:{email:formData.email,hasPassword:!!formData.password},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4bd64d0b-61fc-4eff-91ed-d2f6838af806',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:afterSignIn',message:'signIn result received',data:{ok:result?.ok,error:result?.error,status:result?.status,url:result?.url,fullResult:JSON.stringify(result)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      if (result?.error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4bd64d0b-61fc-4eff-91ed-d2f6838af806',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:errorBranch',message:'Error branch taken',data:{error:result.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        toast.error("Invalid email or password")
        setLoading(false)
        return
      }

      if (result?.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4bd64d0b-61fc-4eff-91ed-d2f6838af806',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:successBranch',message:'Success branch - about to redirect',data:{ok:result.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H4'})}).catch(()=>{});
        // #endregion
        toast.success("Logged in successfully!")
        
        // Redirect to application page
        setTimeout(() => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/4bd64d0b-61fc-4eff-91ed-d2f6838af806',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:redirect',message:'Executing redirect now',data:{target:'/driver/application'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          window.location.href = "/driver/application"
        }, 500)
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4bd64d0b-61fc-4eff-91ed-d2f6838af806',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:unexpectedBranch',message:'Unexpected result branch',data:{result:JSON.stringify(result)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        toast.error("Login failed. Please try again.")
        setLoading(false)
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4bd64d0b-61fc-4eff-91ed-d2f6838af806',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:exception',message:'Exception caught',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      toast.error("Something went wrong: " + String(error))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-600 to-navy-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange rounded-full flex items-center justify-center mb-4">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Driver Portal Login</CardTitle>
          <CardDescription>
            Sign in to access your application and driver dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Link href="/driver/register" className="text-orange hover:underline">
              Register here
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link href="/apply" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to Application
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

