/**
 * Server wrapper: drop `<CustomDetailsPanel entity="load" entityId={id} />`
 * on any detail page and the tenant's custom fields render there — one query
 * for definitions, one carrier-scoped read for values.
 */
import { getHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { ENTITY_META, type CustomFieldEntity } from "@/lib/hub/custom-fields"
import { getCustomValues, listCustomFields } from "@/lib/hub/custom-fields-db"
import { CustomFieldsPanel } from "@/components/hub/CustomFieldsPanel"

export async function CustomDetailsPanel({
  entity,
  entityId,
}: {
  entity: CustomFieldEntity
  entityId: string
}) {
  const user = await getHubUser()
  if (!user) return null
  const [defs, values] = await Promise.all([
    listCustomFields(user.carrierId, entity),
    getCustomValues(user.carrierId, entity, entityId),
  ])
  const isOwner = user.role === "owner"
  if (defs.length === 0 && !isOwner) return null
  return (
    <CustomFieldsPanel
      entity={entity}
      entityId={entityId}
      defs={defs}
      values={values}
      canWrite={can(user.role, ENTITY_META[entity].write)}
      isOwner={isOwner}
    />
  )
}
