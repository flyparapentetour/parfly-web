import './WhatsAppFloat.css'

const PHONE = '573000000000'
const MESSAGE = 'Hola, quiero información sobre los vuelos en parapente.'

function WhatsAppFloat() {
  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(MESSAGE)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Escríbenos por WhatsApp"
    >
      <span className="whatsapp-float__tooltip">¡Escríbenos!</span>
      <span className="whatsapp-float__btn">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M16 3C8.8 3 3 8.8 3 16c0 2.5.7 4.9 2 7L3 29l6.2-2c2 1 4.4 1.6 6.8 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3z"
            fill="currentColor"
          />
          <path
            d="M22.6 19.3c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.8 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.6.2-.2.2-.3.4-.5.1-.2 0-.4 0-.6 0-.2-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.4 4.7.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4z"
            fill="#fff"
          />
        </svg>
      </span>
    </a>
  )
}

export default WhatsAppFloat
