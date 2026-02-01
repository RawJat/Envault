import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DeviceAuthForm } from './device-auth-form'

export default async function DeviceAuthPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/auth/device')
    }

    return <DeviceAuthForm />
}
