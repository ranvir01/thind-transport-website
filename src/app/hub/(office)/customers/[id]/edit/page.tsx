import { notFound } from "next/navigation"
import { getCustomer } from "@/lib/hub/customers"
import { requireOfficeUser } from "@/lib/hub/session"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { CustomerForm, type CustomerFormState } from "@/components/hub/CustomerForm"

export const dynamic = "force-dynamic"

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const customer = await getCustomer(user.carrierId, id).catch(() => null)
  if (!customer) notFound()

  const initial: CustomerFormState = {
    name: customer.name,
    type: customer.type,
    mc_number: customer.mc_number ?? "",
    dot_number: customer.dot_number ?? "",
    billing_email: customer.billing_email ?? "",
    billing_address: customer.billing_address ?? "",
    phone: customer.phone ?? "",
    status_updates_email: customer.status_updates_email ?? "",
    payment_terms_days: customer.payment_terms_days.toString(),
    credit_limit: customer.credit_limit_cents != null ? (customer.credit_limit_cents / 100).toFixed(2) : "",
    factored: customer.factored,
    status: customer.status,
    notes: customer.notes ?? "",
  }

  return (
    <div>
      <BackLink href={`/hub/customers/${id}`} label={customer.name} />
      <PageHeader title={`Edit ${customer.name}`} />
      <CustomerForm customerId={id} initial={initial} />
    </div>
  )
}
