import { PageHeader, BackLink } from "@/components/hub/ui"
import { CustomerForm } from "@/components/hub/CustomerForm"
import { emptyCustomer } from "@/lib/hub/form-defaults"

export default function NewCustomerPage() {
  return (
    <div>
      <BackLink href="/hub/customers" label="Customers" />
      <PageHeader title="Add Customer" />
      <CustomerForm initial={emptyCustomer()} />
    </div>
  )
}
