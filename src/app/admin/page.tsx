import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Admin Dashboard | 4CIMA',
  description: '4CIMA Admin Control Panel',
}

export default function AdminIndex() {
  redirect('/admin/dashboard')
}