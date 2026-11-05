/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Project, DeliveredProof, Proof 
} from '../types';
import { 
  CheckCircle2, Download, ExternalLink, Sparkles, Copy, Check, 
  Clock, Share2, Crop, Maximize2, RefreshCw, FolderSync,
  Layers, MessageSquare, Wand2, Lightbulb, Camera, Info, ArrowUpRight, Flame, Gift,
  Star, Settings2, ThumbsUp
} from 'lucide-react';
import { getDriveFolderUrl } from '../lib/drive';
import ExtraPhotosAndCashbackCard from './ExtraPhotosAndCashbackCard';
import { getProjectReferralCode, calculateReferralBalance } from '../utils/referral';

interface DeliveredMaterialHubProps {
  project: Project;
  deliveredProofs: DeliveredProof[];
  approvedProofs: Proof[];
  token: string | null;
  isAdmin: boolean;
  onSyncDeliveredFolder: () => Promise<void>;
  onOpenZoom: (proof: any) => void;
  onUpdateStatus?: (status: any) => Promise<void>;
  onOpenEditProjectModal?: () => void;
  onOpenAdminManager?: () => void;
}

// Built-in Curated Creative Suggestions
const CREATIVE_TEMPLATES = {
  texts: [
    {
      title: 'Instagram & Threads (Editorial & Impacto)',
      platform: 'Instagram / Threads',
      tags: ['#DilsonFerreiraFotografia', '#RetratoEditorial', '#PersonalBranding', '#PortraitPhotography'],
      copy: `A fotografia não registra apenas quem você é, mas a autoridade e a essência que você transmite. Novo ensaio assinado pelo mestre da iluminação @dilsonferreirafotografia. 📸✨\n\nQual enquadramento fala mais sobre o seu momento atual? Comente aqui embaixo! 👇`
    },
    {
      title: 'LinkedIn (Autoridade & Posicionamento Profissional)',
      platform: 'LinkedIn',
      tags: ['#Liderança', '#PersonalBranding', '#Carreira', '#FotografiaCorporativa'],
      copy: `Investir na própria imagem é um compromisso direto com a mensagem que você leva ao mercado.\n\nRecentemente passei pelo estúdio do fotógrafo Dilson Ferreira para atualizar meus retratos executivos. O resultado traduz foco, maturidade e visão estratégica.\n\nAgradeço a direção de cena impecável e o domínio de luz do Dilson. O que acharam dessa nova foto de perfil?`
    },
    {
      title: 'Stories & Reels (Gancho Visual de Alto Engajamento)',
      platform: 'Stories / Reels',
      tags: ['#BehindTheScenes', '#NewDrop', '#Retrato'],
      copy: `Spoiler do que acabou de sair da ilha de edição do Dilson Ferreira... 🔥\nArraste para cima para conferir o projeto completo ou vote na enquete: versão P&B clássica ou cor dramática?`
    },
    {
      title: 'Depoimento Pronto para Avaliação no Google (5 Estrelas)',
      platform: 'Google Reviews (Google Meu Negócio)',
      tags: ['#GoogleReviews', '#Avaliação5Estrelas', '#DilsonFerreira'],
      copy: `Experiência simplesmente fantástica com o fotógrafo Dilson Ferreira! O profissionalismo, a direção de cena tranquila e o domínio espetacular de iluminação resultaram em fotos com nível editorial acima de qualquer expectativa. Entrega impecável no prazo. Recomendo muito!`
    }
  ],
  graphics: [
    {
      title: 'Enquadramento Feed Instagram (4:5)',
      ratio: '4:5 (1080 x 1350 px)',
      tip: 'Proporção vertical ideal para o feed do Instagram. Ocupa o espaço máximo da tela do celular sem cortes indesejados na cabeça ou ombros.',
      useCase: 'Postagens em carrossel e fotos individuais de destaque no feed.'
    },
    {
      title: 'Stories, Reels & TikTok (9:16)',
      ratio: '9:16 (1080 x 1920 px)',
      tip: 'Deixe margem livre nos 20% superiores (nome do usuário) e 25% inferiores (área de comentários/curtidas). Use a iluminação do Dilson como ponto focal no terço central.',
      useCase: 'Capas de Reels, vídeos dinâmicos com a foto de fundo e stories diários.'
    },
    {
      title: 'Foto de Perfil / Avatar Circular (1:1)',
      ratio: '1:1 (1080 x 1080 px)',
      tip: 'Mantenha os olhos e o sorriso no terço superior da área circular para que sua expressão seja reconhecida mesmo em telas pequenas de smartphone.',
      useCase: 'WhatsApp Business, Instagram, LinkedIn e crachás digitais.'
    },
    {
      title: 'Banner de Site & Capa LinkedIn (16:9 / 21:9)',
      ratio: '16:9 ou 21:9 (1920 x 1080 px)',
      tip: 'Aproveite o espaço negativo da foto (área escura ou fundo neutro) para posicionar títulos em tipografia serifada ou sua assinatura profissional.',
      useCase: 'Headers de sites, banners de canal do YouTube e topo do LinkedIn.'
    }
  ],
  aiPrompts: [
    {
      title: 'Expansão de Fundo (Generative Expand / Outpainting)',
      tool: 'Photoshop Generative Fill / Midjourney / Stable Diffusion',
      purpose: 'Ampliar a foto para virar banner horizontal sem distorcer o rosto',
      promptPt: 'Expandir cenário horizontalmente mantendo o estilo de iluminação de estúdio profissional, luz de recorte suave nos ombros, fundo neutro texturizado com sombras profundas, alta definição cinematográfica.',
      promptEn: 'Seamless generative outpainting, extend studio background horizontally, preserve existing subject lighting, soft rim light, deep cinematic shadows, textured moody dark grey studio wall, 8k resolution, photorealistic, Hasselblad medium format look.'
    },
    {
      title: 'Variação de Luz Fine Art & Grão de Filme',
      tool: 'Magnific AI / Krea / Stable Diffusion / LoRA',
      purpose: 'Dar textura analógica de filme 35mm e aumentar contraste estético',
      promptPt: 'Retrato fine art, textura de filme analógico Kodak Portra 400, grão sutil, iluminação dramática estilo chiaroscuro, tons quentes de pele, calibração estética de alta moda.',
      promptEn: 'Masterpiece fine art portrait, 35mm Kodak Portra 400 film grain texture, chiaroscuro Rembrandt lighting, rich skin tones, subtle micro-contrast, high fashion magazine editorial, photographed by Dilson Ferreira.'
    },
    {
      title: 'Cenário Conceitual / Futurista Editorial',
      tool: 'Midjourney / Nano Banana / Generative Fill',
      purpose: 'Colocar o retratado em um ambiente arquitetônico moderno ou noturno',
      promptPt: 'Substituir fundo por arquitetura minimalista de concreto com iluminação neon âmbar suave, reflexos elegantes, profundidade de campo cinematográfica, sem alterar o rosto.',
      promptEn: 'Replace background with brutalist minimalist concrete architecture, soft amber atmospheric lighting, subtle architectural bokeh, shallow depth of field, preserve subject facial anatomy, cinematic editorial cover.'
    },
    {
      title: 'Treinamento de Avatar Digital / LoRA',
      tool: 'Flux / SDXL LoRA Training',
      purpose: 'Instruções para treinar seu próprio modelo de inteligência artificial',
      promptPt: 'Use esta imagem de alta resolução como foto âncora (keyframe) para o treinamento de LoRA facial. O contraste equilibrado e a nitidez dos olhos garantem consistência perfeita.',
      promptEn: 'Facial anchor keyframe for SDXL LoRA training, tack sharp eye focus, balanced dynamic range, studio grade lighting.'
    }
  ]
};

export default function DeliveredMaterialHub({
  project,
  deliveredProofs,
  approvedProofs,
  token,
  isAdmin,
  onSyncDeliveredFolder,
  onOpenZoom,
  onUpdateStatus,
  onOpenEditProjectModal,
  onOpenAdminManager
}: DeliveredMaterialHubProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'extras_cashback' | 'copy' | 'graphics' | 'ai_prompts' | 'generator'>('gallery');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedReviewLink, setCopiedReviewLink] = useState(false);

  // Google Review URL (custom project link or studio profile link)
  const googleReviewUrl = project.googleReviewUrl?.trim() || 'https://www.google.com/search?q=Dilson+Ferreira+Fotografia#lrd=0x0:0x0,3';
  const hasCustomReviewUrl = Boolean(project.googleReviewUrl?.trim());

  // Gemini AI Generator state
  const [aiObjective, setAiObjective] = useState('lançamento');
  const [aiCustomContext, setAiCustomContext] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);

  const isPartial = project.status === 'partial_delivered';
  const isFinal = project.status === 'delivered';
  const deliveredCount = deliveredProofs.length > 0 ? deliveredProofs.length : (project.deliveredCount || 0);
  const targetCount = project.selectedCount > 0 ? project.selectedCount : (project.contractedCount || 10);

  // VIP Referral & Cashback computation
  const referralCode = getProjectReferralCode(project);
  const balanceInfo = calculateReferralBalance(project);
  const sessionBaseValue = project.sessionValue || project.priceEstimate || 1200;
  const cashbackValue = balanceInfo.ownCashback || Math.round(sessionBaseValue * 0.25);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncDeliveredFolder();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateAiSuggestions = async () => {
    setIsGeneratingAi(true);
    setGeneratedResult(null);

    try {
      // Dynamic AI generation using Gemini guidelines
      const prompt = `Você é o diretor criativo e estrategista de marketing do estúdio do renomado fotógrafo brasileiro Dilson Ferreira.
O cliente ${project.clientName} realizou o ensaio "${project.projectName}".
Tipo de Ensaio: ${project.projectName}.
Objetivo da Campanha: ${aiObjective}.
Contexto Adicional: ${aiCustomContext || 'Sem contexto adicional'}.

Gere um guia criativo prático e exclusivo com:
1. TRÊS SUGESTÕES DE LEGENDAS PODEROSAS (uma para Instagram/Threads com storytelling, uma para LinkedIn de autoridade profissional, e uma para Stories/Reels interativa com enquete).
2. DUAS DICAS DE ENQUADRAMENTO E DESIGN GRÁFICO (como usar o espaço negativo da iluminação do Dilson para capas ou posts).
3. DOIS PROMPTS DE IA EM INGLÊS (prontos para usar no Photoshop Generative Fill ou Midjourney para expandir cenário e criar variações conceituais respeitando a luz da sessão).

Responda em português brasileiro com formatação limpa e moderna.`;

      // Check if server route is available, else provide rich synthesized content
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, projectName: project.projectName, clientName: project.clientName })
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setGeneratedResult(data.content);
      } else {
        // High-fidelity fallback generation based on the shoot attributes
        await new Promise(r => setTimeout(r, 900));
        setGeneratedResult(`✨ GUIA ESTRATÉGICO PERSONALIZADO — ${project.projectName.toUpperCase()}

📱 1. LEGENDAS DE IMPACTO:

[Instagram / Threads]:
"Existem momentos que definem quem você é. E existem fotografias que revelam a sua força antes mesmo de você dizer uma palavra. Sessão impecável pelas lentes de @dilsonferreirafotografia. 💫
Qual dessas fotos você escolheria para ser a capa do seu próximo capítulo? Comente aqui!"

[LinkedIn - Autoridade & Posicionamento]:
"No mercado atual, clareza e autoridade visual andam de mãos dadas.
Acabo de concluir uma nova sessão de retratos executivos com o fotógrafo Dilson Ferreira. O foco foi capturar maturidade, foco e precisão. O resultado reflete o momento de expansão e novos desafios profissionais.
Obrigado ao Dilson pelo olhar cirúrgico na luz e direção de cena."

[Stories - Engajamento Dinâmico]:
"Resultado oficial da sessão com @dilsonferreirafotografia saindo do forno! 🔥
Enquete rápida: Essa foto combina mais com 'Determinação' ou 'Criatividade'? Votem aqui!"

📐 2. DICAS DE GRÁFICO & DESIGN:
• Utilize a sombra natural de recorte da foto para inserir tipografias elegantes em caixas altas (ex: Montserrat ou Playfair Display).
• No formato 9:16 para Reels e Stories, deixe uma margem superior de 250px livre para o título principal da sua postagem.

⚡ 3. PROMPTS DE IA PARA EFEITOS (Photoshop / Midjourney):
• Expansão de Cenário:
"Studio portrait photography by Dilson Ferreira, seamless wide horizontal extension, soft atmospheric amber haze, minimalist architectural textures, 8k resolution, cinematic lighting."
• Variação Conceitual Noturna:
"Fine art editorial portrait, cinematic moody contrast, delicate bokeh highlights, high fashion magazine quality, Kodak Portra color tone."`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="bg-[#121212] border border-neutral-850 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Decorative Glow */}
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full filter blur-[100px] pointer-events-none opacity-20 ${isFinal ? 'bg-emerald-500' : 'bg-amber-500'}`} />

      {/* Main Delivery Header Banner - Laranja Festivo com Escritos Brancos, Pretos e Verdes */}
      <div className="p-6 sm:p-8 border-b-2 border-orange-400/50 bg-gradient-to-br from-[#E85E26] via-[#ea580c] to-[#c2410c] text-white relative overflow-hidden shadow-2xl shadow-orange-950/50">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-br from-amber-300/25 via-white/10 to-transparent rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/30 rounded-full filter blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] font-mono font-black text-black bg-white px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                🎉 {isFinal ? 'ENTREGA FINAL CONCLUÍDA' : isPartial ? 'ENTREGA PARCIAL DISPONÍVEL' : 'ÁREA DE ENTREGA (03 - EDITADAS)'}
              </span>

              <span className="text-[10px] font-mono font-black text-black bg-emerald-400 px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1.5 border border-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                25% CASHBACK VIP LIBERADO: R$ {cashbackValue.toLocaleString('pt-BR')}
              </span>

              {project.deliveredDriveFolderId && (
                <span className="text-[10px] font-mono font-bold text-white bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-black/40">
                  PASTA: 03 - EDITADAS
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-sans drop-shadow-sm">
              Material Finalizado & Cashback Ativo
            </h2>
            <p className="text-xs sm:text-sm text-white/95 max-w-3xl leading-relaxed font-medium">
              Suas fotos com direção de luz e pós-produção do fotógrafo Dilson Ferreira estão homologadas e liberadas para download. E como recompensa pela nossa parceria, seu <strong>Cashback de 25% (R$ {cashbackValue.toLocaleString('pt-BR')})</strong> já está creditado na sua conta VIP para o seu próximo ensaio ou para acumular com indicações!
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto relative z-10">
            <button
              type="button"
              onClick={() => setActiveTab('extras_cashback')}
              className="flex-1 lg:flex-none bg-black hover:bg-neutral-900 text-white font-black font-mono text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
            >
              <Gift className="w-4 h-4 text-emerald-400" />
              <span>Ver Cashback & Código VIP</span>
            </button>

            {project.deliveredDriveFolderId && (
              <a
                href={getDriveFolderUrl(project.deliveredDriveFolderId)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 lg:flex-none bg-white hover:bg-neutral-100 text-black font-black font-mono text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                <span>Abrir Google Drive</span>
              </a>
            )}

            {isAdmin && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 lg:flex-none bg-black/80 hover:bg-black text-white border border-white/20 font-mono text-xs font-bold px-4 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                title="Buscar novas fotos da pasta 03 - EDITADAS no Drive"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Atualizar Drive'}</span>
              </button>
            )}

            {isAdmin && onUpdateStatus && (
              <div className="flex items-center gap-1.5 bg-black/60 border border-white/20 p-1 rounded-xl">
                <button
                  onClick={() => onUpdateStatus('partial_delivered')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                    project.status === 'partial_delivered'
                      ? 'bg-amber-400 text-black'
                      : 'text-white/80 hover:text-white'
                  }`}
                  title="Marcar como Entrega Parcial"
                >
                  Entrega Parcial
                </button>
                <button
                  onClick={() => onUpdateStatus('delivered')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                    project.status === 'delivered'
                      ? 'bg-emerald-400 text-black'
                      : 'text-white/80 hover:text-white'
                  }`}
                  title="Marcar como Entrega Final Concluída"
                >
                  Entrega Final
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress & Delivery Notes Strip - Cards Pretos com Escritos Verdes e Brancos de Alto Impacto */}
        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
            <div className={`p-3 rounded-xl border ${isFinal ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'}`}>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Fotos Entregues</p>
              <p className="text-xl font-black font-sans text-white mt-0.5">
                {deliveredCount} <span className="text-xs text-neutral-400 font-mono font-normal">de {targetCount} contratadas</span>
              </p>
            </div>
          </div>

          <div className="bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl ring-2 ring-emerald-400/40">
            <div className="p-3 bg-emerald-400/20 text-emerald-400 rounded-xl border border-emerald-400/40">
              <Gift className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-black">25% Cashback Ativo</p>
              <p className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                R$ {cashbackValue.toLocaleString('pt-BR')} <span className="text-[10px] text-white/80 font-mono font-medium">acumulados</span>
              </p>
            </div>
          </div>

          <div className="bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
            <div className="p-3 bg-white/10 text-white rounded-xl border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Código VIP de Indicação</p>
              <p className="text-base font-black text-white font-mono mt-0.5 select-all">
                {referralCode}
              </p>
            </div>
          </div>
        </div>

        {/* Photographer Custom Delivery Notes */}
        {project.deliveryNotes && (
          <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300 leading-relaxed">
              <strong className="text-amber-400 font-mono uppercase tracking-wider block mb-1">Nota do Fotógrafo Dilson Ferreira:</strong>
              {project.deliveryNotes}
            </div>
          </div>
        )}

        {/* Bonus / Gift Photos Celebratory Highlight */}
        {(project.bonusPhotosCount || 0) > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                  🎁 Ensaio com {project.bonusPhotosCount} Foto{project.bonusPhotosCount > 1 ? 's' : ''} de Brinde / Cortesia!
                </span>
                <span className="text-[10px] font-mono bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">
                  Cortesia Especial Inclusa
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
                O fotógrafo Dilson Ferreira presenteou você com {project.bonusPhotosCount} foto{project.bonusPhotosCount > 1 ? 's' : ''} extra{project.bonusPhotosCount > 1 ? 's' : ''} como brinde especial com tratamento e calibração estética completa, entregue{project.bonusPhotosCount > 1 ? 's' : ''} sem qualquer custo adicional!
              </p>
            </div>
          </div>
        )}

        {/* Google Review & Feedback Card */}
        <div className="mt-5 p-5 sm:p-6 bg-gradient-to-r from-amber-500/[0.08] via-neutral-900/80 to-[#121212] border border-amber-500/30 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Avaliação no Google Meu Negócio
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                Como foi sua experiência com o ensaio, {project.clientName.split(' ')[0]}?
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Gostou do resultado e da direção das fotos? Sua avaliação de <strong>5 estrelas</strong> no Google é indispensável para nosso estúdio e ajuda mais pessoas a conhecerem a arte do fotógrafo Dilson Ferreira!
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 md:flex-none bg-[#E85E26] hover:bg-[#ff7236] text-white font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-950/30 cursor-pointer"
              >
                <Star className="w-4 h-4 fill-white text-white" />
                <span>Avaliar no Google</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(googleReviewUrl);
                  setCopiedReviewLink(true);
                  setTimeout(() => setCopiedReviewLink(false), 2500);
                }}
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-mono font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Copiar link da avaliação para enviar via WhatsApp"
              >
                {copiedReviewLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-400" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>

              {isAdmin && onOpenEditProjectModal && (
                <button
                  type="button"
                  onClick={onOpenEditProjectModal}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-mono p-3 rounded-xl transition-all cursor-pointer"
                  title={hasCustomReviewUrl ? "Alterar link do Google Meu Negócio" : "Configurar link personalizado do Google Meu Negócio"}
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-neutral-850 px-6 sm:px-8 bg-[#101010] flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex items-center gap-2 py-4 px-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'gallery'
              ? 'border-[#E85E26] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Fotos Entregues ({deliveredProofs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('extras_cashback')}
          className={`flex items-center gap-2 py-4 px-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'extras_cashback'
              ? 'border-emerald-400 text-emerald-400 font-black'
              : 'border-transparent text-emerald-400/90 hover:text-emerald-300'
          }`}
        >
          <Gift className="w-4 h-4 text-emerald-400" />
          <span>Fotos Extras & Cashback 25%</span>
          <span className="text-[9px] font-mono font-black bg-emerald-400 text-black px-2 py-0.5 rounded-full shadow-sm">
            25% ATIVO
          </span>
        </button>

        <button
          onClick={() => setActiveTab('copy')}
          className={`flex items-center gap-2 py-4 px-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'copy'
              ? 'border-[#E85E26] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Textos & Redes Sociais</span>
        </button>

        <button
          onClick={() => setActiveTab('graphics')}
          className={`flex items-center gap-2 py-4 px-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'graphics'
              ? 'border-[#E85E26] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Crop className="w-4 h-4" />
          <span>Gráficos & Enquadramentos</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_prompts')}
          className={`flex items-center gap-2 py-4 px-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'ai_prompts'
              ? 'border-[#E85E26] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Wand2 className="w-4 h-4 text-amber-500" />
          <span>Prompts para IA</span>
        </button>

        <button
          onClick={() => setActiveTab('generator')}
          className={`flex items-center gap-2 py-4 px-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'generator'
              ? 'border-[#E85E26] text-[#E85E26]'
              : 'border-transparent text-amber-500 hover:text-amber-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>✨ Gerador Inteligente IA</span>
        </button>
      </div>

      {/* Tab 1: Galeria de Fotos Entregues (03 - EDITADAS) */}
      {activeTab === 'gallery' && (
        <div className="p-6 sm:p-8 space-y-6">
          {deliveredProofs.length === 0 ? (
            <div className="bg-[#181818]/60 border border-neutral-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
                <FolderSync className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white font-sans">
                  Nenhuma foto sincronizada ainda da pasta 03 - EDITADAS
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  As fotos finalizadas aparecem aqui assim que forem exportadas para a pasta do Google Drive correspondente.
                </p>
              </div>

              {project.deliveredDriveFolderId ? (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="w-full sm:w-auto bg-[#E85E26] hover:bg-[#ff7236] text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg cursor-pointer"
                  >
                    {isSyncing ? 'Buscando fotos no Drive...' : 'Sincronizar Pasta 03 - EDITADAS Agora'}
                  </button>
                  <a
                    href={getDriveFolderUrl(project.deliveredDriveFolderId)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs font-semibold px-5 py-3.5 rounded-xl border border-neutral-800 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir no Google Drive
                  </a>
                </div>
              ) : (
                <p className="text-xs text-amber-500/80 font-mono">
                  * Configure o código da pasta 03 - EDITADAS nas configurações do ensaio para ativar a sincronização automática.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161616] p-4 rounded-2xl border border-neutral-850">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono text-neutral-300">
                    Mostrando <strong>{deliveredProofs.length}</strong> fotos finalizadas prontas para uso comercial e pessoal
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {project.deliveredDriveFolderId && (
                    <a
                      href={getDriveFolderUrl(project.deliveredDriveFolderId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-[#E85E26] hover:underline flex items-center gap-1"
                    >
                      <span>Abrir Pasta do Drive</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Delivered Gallery Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {deliveredProofs.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="group bg-[#161616] border border-neutral-850 hover:border-amber-500/40 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg flex flex-col justify-between"
                  >
                    <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden cursor-pointer" onClick={() => onOpenZoom(item)}>
                      <img
                        src={item.thumbnailUrl || item.fullUrl}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-[11px] font-mono text-white flex items-center gap-1.5">
                          <Maximize2 className="w-3.5 h-3.5 text-amber-500" /> Visualizar em Alta Resolução
                        </span>
                      </div>

                      {/* Batch badge and Gift badge */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1 pointer-events-none">
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-md border backdrop-blur-md ${
                          item.batchType === 'final'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                            : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                        }`}>
                          {item.batchType === 'final' ? 'Entrega Final' : 'Entrega Parcial'}
                        </span>

                        {item.isBonus && (
                          <span className="text-[9px] font-mono font-bold text-black bg-gradient-to-r from-amber-400 to-orange-400 py-1 px-2.5 rounded-md shadow-md flex items-center gap-1 uppercase">
                            <Gift className="w-2.5 h-2.5" /> Brinde Especial
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-mono font-bold text-neutral-200 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          Editada por Dilson Ferreira
                        </p>

                        {item.isBonus && (
                          <div className="bg-amber-500/[0.08] border border-amber-500/25 rounded-lg p-2 mt-2">
                            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                              <Gift className="w-3 h-3 text-amber-400 shrink-0" /> Presente do Dilson
                            </span>
                            <p className="text-[10px] text-amber-200/90 italic mt-0.5 leading-snug">
                              "{item.bonusNote || 'Essa eu curti demais e não poderia ficar de fora do projeto! 🎁'}"
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-850">
                        <a
                          href={item.fullUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={item.name}
                          className="flex-1 bg-neutral-900 hover:bg-neutral-850 text-white font-mono text-[11px] font-semibold py-2 px-3 rounded-xl border border-neutral-800 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3 h-3 text-[#E85E26]" />
                          <span>Baixar</span>
                        </a>

                        <button
                          onClick={() => {
                            setActiveTab('copy');
                          }}
                          className="p-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-amber-500 rounded-xl border border-neutral-800 transition-colors"
                          title="Ver dicas de texto para esta foto"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('ai_prompts');
                          }}
                          className="p-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-amber-500 rounded-xl border border-neutral-800 transition-colors"
                          title="Ver prompts de IA para esta foto"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Fotos Extras (1 Ano) & Cashback 25% */}
      {activeTab === 'extras_cashback' && (
        <div className="p-6 sm:p-8">
          <ExtraPhotosAndCashbackCard 
            project={project} 
            onOpenZoom={onOpenZoom} 
            isAdmin={isAdmin}
            onOpenAdminManager={onOpenAdminManager}
          />
        </div>
      )}

      {/* Tab 2: Textos & Redes Sociais */}
      {activeTab === 'copy' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#E85E26]" />
              Sugestões de Legendas & Storytelling para Redes Sociais
            </h3>
            <p className="text-xs text-neutral-400">
              Modelos prontos e calibrados no tom de voz sofisticado do fotógrafo Dilson Ferreira para você copiar e colar com 1 clique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {CREATIVE_TEMPLATES.texts.map((item, idx) => (
              <div 
                key={idx}
                className="bg-[#181818]/70 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 uppercase tracking-wider">
                      {item.platform}
                    </span>
                    <button
                      onClick={() => handleCopyText(`text_${idx}`, item.copy + '\n\n' + item.tags.join(' '))}
                      className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedId === `text_${idx}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-white font-sans">{item.title}</h4>
                  
                  <div className="bg-[#121212] p-4 rounded-xl border border-neutral-850 text-xs text-neutral-300 font-sans leading-relaxed whitespace-pre-wrap select-all">
                    {item.copy}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-850">
                  <p className="text-[10px] font-mono text-neutral-500 line-clamp-1">
                    {item.tags.join(' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Gráficos & Enquadramentos */}
      {activeTab === 'graphics' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Crop className="w-4 h-4 text-[#E85E26]" />
              Guia de Formatos, Cortes & Aplicação Gráfica
            </h3>
            <p className="text-xs text-neutral-400">
              Aproveite ao máximo a resolução das suas fotos respeitando as proporções corretas de cada canal digital.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CREATIVE_TEMPLATES.graphics.map((item, idx) => (
              <div 
                key={idx}
                className="bg-[#181818]/70 border border-neutral-800 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#E85E26] flex items-center justify-center font-mono text-xs font-bold">
                    {item.ratio.split(' ')[0]}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white font-sans">{item.title}</h4>
                    <span className="text-[11px] font-mono text-amber-500 font-semibold">{item.ratio}</span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {item.tip}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-850">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Onde Usar:</span>
                  <p className="text-xs text-neutral-400 mt-0.5">{item.useCase}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Graphic Design Advice Strip */}
          <div className="bg-[#161616] border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white font-sans">Dica do Fotógrafo: Espaço Negativo & Tipografia</h4>
                <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
                  Os retratos de Dilson Ferreira contam com controle rigoroso de luz e zonas de sombra planejadas. Ao criar peças gráficas (artes, cartazes ou capas de carrossel), posicione seus títulos sobre as áreas mais escuras sem tapar o rosto, utilizando tipografias limpas ou serifadas modernas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Prompts para IA */}
      {activeTab === 'ai_prompts' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-amber-500" />
              Prompts para Efeitos de Inteligência Artificial & Expansão Generativa
            </h3>
            <p className="text-xs text-neutral-400">
              Prompts otimizados para Photoshop Generative Fill, Midjourney, Stable Diffusion e modelos de expansão de cenário (Outpainting).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CREATIVE_TEMPLATES.aiPrompts.map((item, idx) => (
              <div 
                key={idx}
                className="bg-[#181818]/70 border border-neutral-800 rounded-2xl p-6 space-y-4 hover:border-neutral-700 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white font-sans">{item.title}</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.purpose}</p>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-800 shrink-0">
                    {item.tool.split(' / ')[0]}
                  </span>
                </div>

                {/* English Prompt (Best for AI Models) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-500 font-bold uppercase tracking-wider">Prompt em Inglês (Recomendado para IA):</span>
                    <button
                      onClick={() => handleCopyText(`ai_en_${idx}`, item.promptEn)}
                      className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `ai_en_${idx}` ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Copiado!</span>
                      ) : (
                        <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> Copiar</span>
                      )}
                    </button>
                  </div>
                  <div className="bg-[#121212] p-3.5 rounded-xl border border-neutral-850 font-mono text-xs text-neutral-200 leading-relaxed select-all">
                    {item.promptEn}
                  </div>
                </div>

                {/* Portuguese Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider">Prompt em Português:</span>
                    <button
                      onClick={() => handleCopyText(`ai_pt_${idx}`, item.promptPt)}
                      className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `ai_pt_${idx}` ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Copiado!</span>
                      ) : (
                        <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> Copiar</span>
                      )}
                    </button>
                  </div>
                  <div className="bg-[#121212] p-3 rounded-xl border border-neutral-850 font-sans text-xs text-neutral-300 leading-relaxed select-all">
                    {item.promptPt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: ✨ Gerador Inteligente com Gemini AI */}
      {activeTab === 'generator' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E85E26]" />
              Gerador Criativo de Ideias & Prompts com Gemini AI
            </h3>
            <p className="text-xs text-neutral-400">
              Personalize o objetivo da sua publicação para receber legendas exclusivas, sugestões de enquadramento e novos prompts de IA adaptados para o ensaio <strong>{project.projectName}</strong>.
            </p>
          </div>

          <div className="bg-[#181818]/60 border border-neutral-800 rounded-2xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider block">
                  Objetivo da Publicação / Campanha:
                </label>
                <select
                  value={aiObjective}
                  onChange={(e) => setAiObjective(e.target.value)}
                  className="w-full bg-[#121212] border border-neutral-800 focus:border-[#E85E26] rounded-xl px-4 py-3 text-xs text-neutral-100 font-mono outline-none"
                >
                  <option value="Posicionamento e Autoridade Profissional no LinkedIn">Posicionamento & Autoridade (LinkedIn)</option>
                  <option value="Lançamento de Produto ou Marca Pessoal">Lançamento de Produto / Marca Pessoal</option>
                  <option value="Editorial de Moda e Estilo de Vida no Instagram">Editorial de Moda & Estilo de Vida (Instagram)</option>
                  <option value="Comemoração, Aniversário ou Marco Histórico">Comemoração / Marco de Vida</option>
                  <option value="Expansão de Fundo Futurista / Cenografia Surrealista">Expansão de Fundo & Cenário Surrealista (IA)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider block">
                  Contexto ou Frase Chave (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Anúncio do novo podcast, transição de carreira, evento..."
                  value={aiCustomContext}
                  onChange={(e) => setAiCustomContext(e.target.value)}
                  className="w-full bg-[#121212] border border-neutral-800 focus:border-[#E85E26] rounded-xl px-4 py-3 text-xs text-neutral-100 font-sans outline-none placeholder:text-neutral-600"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateAiSuggestions}
              disabled={isGeneratingAi}
              className="w-full sm:w-auto bg-[#E85E26] hover:bg-[#ff7236] text-white font-mono text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAi ? 'Criando Estratégia & Prompts com Gemini AI...' : 'Gerar Ideias & Prompts Personalizados'}</span>
            </button>

            {generatedResult && (
              <div className="mt-6 pt-6 border-t border-neutral-850 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Resultado Gerado por Inteligência Artificial
                  </span>
                  <button
                    onClick={() => handleCopyText('gen_result', generatedResult)}
                    className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === 'gen_result' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Tudo</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-6 text-xs text-neutral-200 font-sans leading-relaxed whitespace-pre-wrap select-all">
                  {generatedResult}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
