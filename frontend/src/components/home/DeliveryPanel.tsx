import { DeliveryForm } from "../deliveries/DeliveryForm"

export function DeliveryPanel({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  return (
    <DeliveryForm
      onClose={onClose}
      onSuccess={onSuccess}
      showCloseButton={true}
      title="Registrar Paquete"
      submitLabel="Registrar"
    />
  )
}