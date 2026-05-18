// Configuración pública de Bold. La llave secreta y la firma de
// integridad NUNCA viven en el cliente — eso pasa server-side en
// la Cloud Function `generateBoldHash`. Este módulo solo expone
// constantes UI.

export const BOLD_FUNCTIONS_REGION = 'us-central1'

// URL del webhook expuesto por la Cloud Function `boldWebhook`.
// El admin la copia y la pega en su panel Bold → Webhooks.
export const BOLD_WEBHOOK_URL =
  'https://us-central1-parfly-prod.cloudfunctions.net/boldWebhook'

// Script oficial de Bold para inyectar el botón de pago. La firma
// (integritySignature) se genera server-side y se aplica al script
// como data-attribute desde `services/bold.js`.
export const BOLD_BUTTON_SCRIPT_URL =
  'https://checkout.bold.co/library/boldPaymentButton.js'
