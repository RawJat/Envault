import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthLayout } from '@/components/auth/auth-layout'

export default async function Home() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        redirect('/dashboard')
    }

    return (
        <AuthLayout>
            <AuthForm />
        </AuthLayout>
    )
}
