import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, Mail, Send, CheckCircle2, AlertCircle, Clock, Navigation } from 'lucide-react';
import { SystemConfig } from '../../types'; // Note: path will be adjusted when copying to the final src directory

interface ContactSectionProps {
  config: SystemConfig;
}

// O admin pode colar o código <iframe ...> inteiro (Compartilhar → Incorporar um mapa)
// ou apenas a URL. Extraímos o src do snippet quando presente.
const extractSrc = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/src="([^"]+)"/i);
  return (m ? m[1] : raw).trim();
};

// Um link só renderiza em <iframe> se for do endpoint de embed do Google Maps
// (/maps/embed?pb=...) ou trouxer output=embed. Links de compartilhamento
// (maps.app.goo.gl, /maps/place/...) são bloqueados por X-Frame-Options.
const isEmbeddable = (url?: string) =>
  !!url && (url.includes('/maps/embed') || url.includes('output=embed'));

// Fonte do iframe: prioriza um embed explícito; senão deriva do endereço.
const getMapSrc = (mapEmbedUrl?: string, address?: string): string | null => {
  const src = extractSrc(mapEmbedUrl);
  if (isEmbeddable(src)) return src as string;
  if (address) return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  return null;
};

// Destino do botão "Como chegar": o link de compartilhamento, se houver; senão
// busca pelo endereço; em último caso, o próprio embed (ao menos abre o mapa).
const getDirectionsHref = (mapEmbedUrl?: string, address?: string): string | null => {
  const src = extractSrc(mapEmbedUrl);
  if (src && !isEmbeddable(src)) return src;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  if (src) return src;
  return null;
};

export default function ContactSection({ config }: ContactSectionProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const mapSrc = getMapSrc(config.mapEmbedUrl, config.address);
  const directionsHref = getDirectionsHref(config.mapEmbedUrl, config.address);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setSubmitStatus('error');
      setErrorMessage('Por favor, preencha todos os campos obrigatórios (Nome, E-mail e Mensagem).');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar a mensagem. Tente novamente mais tarde.');
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Ocorreu um erro ao enviar sua mensagem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contato" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Informações da Paróquia */}
          <div className="flex flex-col justify-center">
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[#5A5A40] font-black uppercase text-xs tracking-[0.2em] mb-3"
            >
              Fale Conosco
            </motion.p>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-8"
            >
              Contato & Localização
            </motion.h2>
            <p className="text-gray-500 mb-12 leading-relaxed">
              Estamos aqui para acolher você. Se tiver alguma dúvida sobre celebrações, dízimo, catequese, sacramentos ou queira falar com a secretaria, preencha o formulário ou entre em contato pelos canais oficiais.
            </p>

            <div className="space-y-8">
              {config.address && (
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Endereço</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{config.address}</p>
                  </div>
                </div>
              )}

              {config.phone && (
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Telefone / WhatsApp</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{config.phone}</p>
                  </div>
                </div>
              )}

              {config.email && (
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">E-mail</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{config.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formulário de Contato */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gray-50 p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-lg"
          >
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-8">Envie uma Mensagem</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Nome Completo *</label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Seu nome"
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">E-mail *</label>
                  <input 
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="seu.email@exemplo.com"
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Telefone (opcional)</label>
                  <input 
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Mensagem *</label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Escreva sua mensagem aqui..."
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-all text-sm resize-none"
                />
              </div>

              {/* Status Feedbacks */}
              <AnimatePresence mode="wait">
                {submitStatus === 'success' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-center gap-3 text-sm font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Sua mensagem foi enviada com sucesso! A secretaria paroquial entrará em contato em breve.</span>
                  </motion.div>
                )}
                {submitStatus === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-4 bg-rose-50 text-rose-800 rounded-2xl border border-rose-100 flex items-center gap-3 text-sm font-medium"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold hover:bg-[#4A4A35] transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#5A5A40]/15 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Mensagem
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Mapa de localização */}
        {mapSrc && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mt-16 rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-lg"
          >
            <iframe
              title="Localização da paróquia"
              src={mapSrc}
              className="w-full h-72 md:h-96 grayscale-[0.15]"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            {directionsHref && (
              <a
                href={directionsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-5 right-5 bg-white text-[#5A5A40] px-5 py-3 rounded-2xl font-bold text-sm shadow-xl hover:bg-[#F3F4F1] transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                <Navigation className="w-4 h-4" />
                Como chegar
              </a>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
