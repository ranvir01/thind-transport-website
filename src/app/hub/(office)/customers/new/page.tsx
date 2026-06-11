import { PageHeader, BackLink } from "@/components/hub/ui"
import { CustomerForm, emptyCustomer } from "@/components/hub/CustomerForm"

export default function NewCustomerPage() {
  return (
    <div>
      <BackLink href="/hub/customers" label="Customers" />
      <PageHeader title="Add Customer" />
      <CustomerForm initial={emptyCustomer()} />
    </div>
  )
}
