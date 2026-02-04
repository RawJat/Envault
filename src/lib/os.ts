import { headers } from 'next/headers'

export async function getServerOS(): Promise<'mac' | 'other'> {
    const headersList = await headers()
    const ua = headersList.get('user-agent') ?? ''

    if (/Mac|iPhone|iPod|iPad/.test(ua)) {
        return 'mac'
    }

    return 'other'
}
