'use client';

import { usePathname } from 'next/navigation';

const WHATSAPP_NUMBER = '917979804477';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function WhatsAppFloat() {
  const pathname = usePathname() || '';

  // Hide inside admin / content-admin / printable invoice
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/content-admin') ||
    pathname.startsWith('/subadmin') ||
    pathname.includes('/invoice')
  ) {
    return null;
  }

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 group"
    >
      <span
        className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/40 hover:scale-110 active:scale-95 transition-transform"
      >
        <svg viewBox="0 0 32 32" className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" aria-hidden>
          <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.03 1.318-1.044 2.247v.114c-.014.99.4 1.973.973 2.747 1.5 1.998 3.06 3.748 5.39 4.518.378.114.768.214 1.16.286.41.072.78.072 1.146.014.41-.072.78-.214 1.103-.487.302-.244.487-.602.6-.945.142-.43.142-.83.085-1.275-.057-.286-.214-.487-.515-.572-.286-.085-.572-.142-.86-.286zm-3.105 6.974h-.014a9.184 9.184 0 0 1-4.69-1.286l-.33-.2-3.487.916.93-3.4-.214-.358a9.18 9.18 0 0 1-1.4-4.886c0-5.073 4.13-9.2 9.2-9.2 2.46 0 4.77.96 6.5 2.7a9.13 9.13 0 0 1 2.7 6.514c0 5.072-4.13 9.2-9.2 9.2zm7.834-17.043a11 11 0 0 0-7.834-3.247c-6.107 0-11.08 4.97-11.094 11.08 0 1.948.515 3.85 1.49 5.526L4.81 28l5.642-1.475a11.08 11.08 0 0 0 5.297 1.347h.014c6.108 0 11.08-4.97 11.095-11.08 0-2.962-1.16-5.747-3.247-7.838z" />
        </svg>
      </span>
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:block whitespace-nowrap bg-brand-charcoal text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
        Chat with us
      </span>
    </a>
  );
}
