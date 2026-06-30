import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, MessageCircle, HandHeart, AlertCircle } from 'lucide-react';

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
  pixKey?: string;
  whatsappNumber?: string;
}

// Mantém apenas os dígitos do número para o link wa.me
const onlyDigits = (value: string) => value.replace(/\D/g, '');

export default function DonationModal({
  open,
  onClose,
  eventTitle,
  pixKey,
  whatsappNumber,
}: DonationModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Não foi possível copiar a chave PIX.', err);
    }
  };

  const whatsappDigits = whatsappNumber ? onlyDigits(whatsappNumber) : '';
  const whatsappMessage = encodeURIComponent(
    `Olá! Segue o comprovante da minha doação/oferta para o evento: ${eventTitle}.`
  );
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${whatsappMessage}`
    : '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] overflow-hidden shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
          >
            {/* Botão fechar */}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white text-gray-600 rounded-full shadow-md transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho */}
            <div className="bg-[#5A5A40] text-white p-8 pb-7">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/15 rounded-2xl">
                  <HandHeart className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-serif font-bold">Doar / Pagar</h3>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Sua contribuição para{' '}
                <span className="font-semibold text-white">{eventTitle}</span>
              </p>
            </div>

            {/* Conteúdo */}
            <div className="p-8">
              {pixKey ? (
                <>
                  {/* Chave PIX em destaque */}
                  <div className="mb-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5A5A40] mb-2">
                      Chave PIX da Paróquia
                    </p>
                    <div className="flex items-stretch gap-2">
                      <div className="flex-1 min-w-0 bg-[#F5F5F0] border border-gray-200 rounded-2xl px-4 py-3.5">
                        <p className="text-gray-900 font-mono text-sm font-semibold break-all">
                          {pixKey}
                        </p>
                      </div>
                      <button
                        onClick={handleCopy}
                        aria-label="Copiar chave PIX"
                        className={`shrink-0 flex items-center gap-1.5 px-4 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
                          copied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[#5A5A40] text-white hover:bg-[#4a4a34]'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Instrução */}
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-amber-900 leading-relaxed">
                      Após o PIX, envie o comprovante para o WhatsApp da paróquia
                      informando que é para o evento:{' '}
                      <span className="font-bold">{eventTitle}</span>.
                    </p>
                  </div>

                  {/* Botão WhatsApp */}
                  {whatsappDigits && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Enviar comprovante no WhatsApp
                    </a>
                  )}
                </>
              ) : (
                /* Degradação graciosa: sem chave PIX configurada */
                <div className="text-center py-6">
                  <div className="inline-flex p-3 bg-amber-50 rounded-2xl mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="text-gray-700 font-medium">
                    Chave PIX ainda não configurada pela paróquia.
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Por favor, tente novamente mais tarde.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
