"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

export default function DashboardPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isWaving } = useTheme();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [visibilidade, setVisibilidade] = useState({
    global: true, saldos: true, resumo: true, cartoes: true, extrato: true
  });

  const toggleVisibilidadeGlobal = () => {
    const novoEstado = !visibilidade.global;
    setVisibilidade({ global: novoEstado, saldos: novoEstado, resumo: novoEstado, cartoes: novoEstado, extrato: novoEstado });
  };

  const toggleVisibilidadeBloco = (bloco: keyof typeof visibilidade) => {
    setVisibilidade(prev => {
      const newState = { ...prev, [bloco]: !prev[bloco] };
      if (!newState[bloco]) newState.global = false;
      return newState;
    });
  };

  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // ==========================================
  // DYNAMIC ISLAND 2.0 (LIQUID GLASS + BALLOON)
  // ==========================================
  const [island, setIsland] = useState({ show: false, isClosing: false, message: "", type: "info", icon: "✨" });
  const islandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const islandCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showIsland = (message: string, type: "success" | "error" | "info" = "info", icon: string = "✨") => {
    if (islandTimeoutRef.current) clearTimeout(islandTimeoutRef.current);
    if (islandCloseTimeoutRef.current) clearTimeout(islandCloseTimeoutRef.current);

    setIsland({ show: true, isClosing: false, message, type, icon });

    // Inicia a animação de "estourar" um pouco antes de sumir da tela
    islandTimeoutRef.current = setTimeout(() => {
      setIsland(prev => ({ ...prev, isClosing: true }));
      // Remove do DOM após a animação terminar (400ms)
      islandCloseTimeoutRef.current = setTimeout(() => {
        setIsland(prev => ({ ...prev, show: false, isClosing: false }));
      }, 400);
    }, 3600);
  };

  const getDatLocal = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  const [tipo, setTipo] = useState<"receita" | "despesa" | "transferencia">("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(getDatLocal(new Date()));
  const [categoriaId, setCategoriaId] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [modoParcelamento, setModoParcelamento] = useState<"ultima" | "primeira" | "manual">("ultima");
  const [valoresParcelasManual, setValoresParcelasManual] = useState<string[]>([]);
  const [isPagamentoFatura, setIsPagamentoFatura] = useState(false);

  const [formaPagtoId, setFormaPagtoId] = useState("");
  const [bancoOrigemId, setBancoOrigemId] = useState("");
  const [bancoDestinoId, setBancoDestinoId] = useState("");
  const [faturaDestinoId, setFaturaDestinoId] = useState("");

  const [contasFixasSugestoes, setContasFixasSugestoes] = useState<any[]>([]);
  const [vinculoContaFixa, setVinculoContaFixa] = useState<{ contaFixaId: string; ocorrenciaId: string | null } | null>(null);
  const [ocorrenciaOriginalVinculada, setOcorrenciaOriginalVinculada] = useState<any | null>(null);
  const [descricaoTocada, setDescricaoTocada] = useState(false);

  const [isFormaPagtoOpen, setIsFormaPagtoOpen] = useState(false);
  const [isBancoOrigemOpen, setIsBancoOrigemOpen] = useState(false);
  const [isBancoDestinoOpen, setIsBancoDestinoOpen] = useState(false);
  const [isFaturaDestinoOpen, setIsFaturaDestinoOpen] = useState(false);

  const hojeData = new Date();
  const [dataInicio, setDataInicio] = useState(getDatLocal(new Date(hojeData.getFullYear(), hojeData.getMonth(), 1)));
  const [dataFim, setDataFim] = useState(getDatLocal(hojeData));
  const [atalhoAtivo, setAtalhoAtivo] = useState("m");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [textoInputData, setTextoInputData] = useState("");
  const atalhoDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const CODIGOS_ATALHO = ["h", "o", "s", "sa", "m", "ma", "a", "aa"];

  const [filtroTipo, setFiltroTipo] = useState<string[]>(["receita", "despesa", "transferencia"]);
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [somenteMinhasContas, setSomenteMinhasContas] = useState(true);

  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("");
  const [filtroFormaPagto, setFiltroFormaPagto] = useState("");

  const [abaExtrato, setAbaExtrato] = useState<"extrato" | "parcelamentos">("extrato");

  const [qtdFaturasVisiveis, setQtdFaturasVisiveis] = useState(3);
  const [cartoesExpandidos, setCartoesExpandidos] = useState<Record<string, boolean>>({});
  const [buscaParcelamento, setBuscaParcelamento] = useState("");
  const [grupoExpandidoId, setGrupoExpandidoId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [transacaoAlvo, setTransacaoAlvo] = useState<any>(null);
  const [motivoAuditoria, setMotivoAuditoria] = useState("");
  const [palavraConfirmacao, setPalavraConfirmacao] = useState("");
  const [isProcessingAudit, setIsProcessingAudit] = useState(false);
  const [motivosFrequentes, setMotivosFrequentes] = useState<string[]>([]);

  const formatarMoeda = (v: number, mostrar: boolean = true) => {
    if (!mostrar) return "R$ •••••";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  };

  const formatarDataNormal = (dStr: string) => {
    const [a, m, d] = dStr.split("-");
    return `${d}/${m}/${a}`;
  };

  const closeAllDropdowns = () => {
    setIsFormaPagtoOpen(false); setIsBancoOrigemOpen(false); setIsBancoDestinoOpen(false); setIsFaturaDestinoOpen(false);
  };

  const nomesAtalhos: Record<string, string> = {
    h: "Hoje", o: "Ontem", s: "Acumulado da Semana", sa: "Semana Anterior",
    m: "Acumulado do Mês", ma: "Mês Anterior", a: "Acumulado do Ano", aa: "Ano Anterior"
  };

  const carregarDados = async (isInitialLoad = false, usernameOverride?: string) => {
    setIsLoadingData(true);

    const { data: perfisData } = await supabase.from("profiles").select("username, avatar_url");
    if (perfisData) {
      const mapa: Record<string, string> = {};
      perfisData.forEach((p) => { if (p.username && p.avatar_url) mapa[p.username] = p.avatar_url; });
      setMapPerfis(mapa);
    }

    const { data: historico, error } = await supabase
      .from("transacoes")
      .select(`*, categorias(nome), conta_origem:contas!conta_id(*, banco_vinculado:contas_bancarias(*)), conta_destino:contas!conta_destino_id(*, banco_vinculado:contas_bancarias(*))`)
      .order("data", { ascending: false }).order("criado_em", { ascending: false });

    if (error) { showIsland("Erro ao carregar dados.", "error", "⚠️"); }

    const { data: contasData } = await supabase.from("contas").select("*, banco_vinculado:contas_bancarias(*)").order("nome");
    const { data: bancosData } = await supabase.from("contas_bancarias").select("*").order("nome", { ascending: true });

    if (bancosData) setBancos(bancosData);
    if (contasData) setContas(contasData);

    if (historico) {
      setTransacoes(historico);
      const autoresTransacoes = historico.map((t) => t.autor_nome || "Usuário");
      const autoresContas = contasData ? contasData.map((c) => c.autor_nome || "Usuário") : [];
      const euMesmo = usernameOverride || username || "Usuário";
      const unicos = Array.from(new Set([...autoresTransacoes, ...autoresContas, euMesmo].filter((n) => n && n !== "Família")));

      setUsuariosDisponiveis(unicos);
      if (isInitialLoad) setUsuariosSelecionados(unicos);
    }
    if (isInitialLoad) {
      try {
        // 1. Descobre se ele tem pelo menos uma caixinha (já que o Dash não carrega caixinhas)
        const { data: caixinhasData } = await supabase.from("caixinhas").select("id").limit(1);
        
        if (caixinhasData && caixinhasData.length > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          const uid = session?.user?.id;
          
          if (uid) {
            // 2. Puxa os parâmetros do usuário
            const { data: params } = await supabase
              .from("parametros")
              .select("chave, valor")
              .eq("user_id", uid)
              .in("chave", ["notificar_rendimento", "dias_alerta_rendimento"]);

            let alertaAtivo = true; 
            let diasAlerta = 15; 

            params?.forEach(p => {
              if (p.chave === "notificar_rendimento") alertaAtivo = p.valor;
              if (p.chave === "dias_alerta_rendimento") diasAlerta = Number(p.valor);
            });

            if (alertaAtivo) {
              const { data: ultimoRend } = await supabase
                .from("caixinhas_historico")
                .select("data")
                .eq("user_id", uid)
                .eq("tipo", "rendimento")
                .order("data", { ascending: false })
                .limit(1);

              let deveAlertar = false;

              if (!ultimoRend || ultimoRend.length === 0) {
                deveAlertar = true; 
              } else {
                const dataUltimoRend = new Date(ultimoRend[0].data);
                const hojeCalc = new Date();
                const diferencaTempo = Math.abs(hojeCalc.getTime() - dataUltimoRend.getTime());
                const diasPassados = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

                if (diasPassados >= diasAlerta) {
                  deveAlertar = true;
                }
              }

              if (deveAlertar) {
                setTimeout(() => {
                  showIsland(`Investimentos há mais de ${diasAlerta} dias sem atualizar rendimento!`, "info", "💡");
                }, 3500);
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao processar alertas de rendimento", err);
      }
    }

    setIsLoadingData(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const usernameResolvido = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";
        setUserId(user.id); setEmail(user.email || "");
        setUsername(usernameResolvido);
        setFullName(user.user_metadata?.full_name || ""); setAvatarUrl(user.user_metadata?.avatar_url || "");

        const { data: catData } = await supabase.from("categorias").select("*").order("nome");
        if (catData) setCategorias(catData);

        const { data: paramFaturas } = await supabase.from("parametros").select("valor").eq("user_id", user.id).eq("chave", "qtd_faturas_visiveis").maybeSingle();
        if (paramFaturas?.valor) setQtdFaturasVisiveis(Number(paramFaturas.valor));

        // Catch-up das assinaturas vencidas: o banco gera de uma vez só
        // (mesmo que sejam vários dias/meses acumulados) e retorna quantos
        // lançamentos entraram, sem travar a tela — só um aviso, como o
        // lembrete de rendimento das caixinhas.
        const { data: assinaturasGeradas } = await supabase.rpc("processar_assinaturas");
        if (assinaturasGeradas && assinaturasGeradas > 0) {
          showIsland(`${assinaturasGeradas} lançamento(s) de assinatura gerado(s)!`, "success", "🔁");
        }

        // Passa o username já resolvido: o estado "username" ainda não foi
        // commitado neste ponto (mesmo render do setUsername acima), então
        // usar apenas o estado aqui faria o "eu mesmo" cair no fallback
        // literal "Usuário" no primeiro carregamento da página.
        carregarDados(true, usernameResolvido);
      } else {
        router.push("/login");
      }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (tipo !== "despesa" || !categoriaId || parcelas > 1) { setContasFixasSugestoes([]); return; }
    let cancelado = false;
    const buscarSugestoes = async () => {
      const { data: fixas } = await supabase.from("contas_fixas").select("*").eq("categoria_id", categoriaId).eq("arquivada", false).eq("modo", "unico");
      if (!fixas || fixas.length === 0) { if (!cancelado) setContasFixasSugestoes([]); return; }
      const [ano, mes] = data.split("-").map(Number);
      const { data: ocs } = await supabase.from("contas_fixas_ocorrencias").select("*").eq("competencia_ano", ano).eq("competencia_mes", mes).in("conta_fixa_id", fixas.map((f) => f.id));
      if (cancelado) return;
      setContasFixasSugestoes(fixas.map((f) => ({ ...f, ocorrencia: ocs?.find((o) => o.conta_fixa_id === f.id) || null })));
    };
    buscarSugestoes();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, categoriaId, data, parcelas]);

  // Mantém o array de valores manuais em sincronia com a quantidade de
  // parcelas, preservando o que o usuário já editou e preenchendo as
  // parcelas novas com a divisão padrão (base + diferença na última).
  useEffect(() => {
    if (modoParcelamento !== "manual") return;
    setValoresParcelasManual((prev) => {
      const total = parseFloat((valor || "0").replace(",", ".")) || 0;
      const base = parcelas > 0 ? Math.floor((total / parcelas) * 100) / 100 : 0;
      const diferenca = Number((total - base * parcelas).toFixed(2));
      return Array.from({ length: parcelas }, (_, i) => {
        if (prev[i] !== undefined) return prev[i];
        const v = i === parcelas - 1 ? base + diferenca : base;
        return v.toFixed(2).replace(".", ",");
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoParcelamento, parcelas]);

  const atualizarValorParcelaManual = (index: number, value: string) => {
    setValoresParcelasManual((prev) => {
      const novo = [...prev];
      novo[index] = value;
      return novo;
    });
  };

  const aplicarAtalho = (atalho: string) => {
    const d = new Date(); let inicio = new Date(); let fim = new Date(); let reconhecido = true;
    switch (atalho.toLowerCase().trim()) {
      case "h": break;
      case "o": inicio.setDate(d.getDate() - 1); fim.setDate(d.getDate() - 1); break;
      case "s": inicio.setDate(d.getDate() - d.getDay()); break;
      case "sa": const dSem = d.getDay(); inicio.setDate(d.getDate() - dSem - 7); fim.setDate(d.getDate() + (6 - dSem) - 7); break;
      case "m": inicio = new Date(d.getFullYear(), d.getMonth(), 1); break;
      case "ma": inicio = new Date(d.getFullYear(), d.getMonth() - 1, 1); fim = new Date(d.getFullYear(), d.getMonth(), 0); break;
      case "a": inicio = new Date(d.getFullYear(), 0, 1); break;
      case "aa": inicio = new Date(d.getFullYear() - 1, 0, 1); fim = new Date(d.getFullYear() - 1, 11, 31); break;
      default: reconhecido = false; break;
    }
    if (reconhecido) { setDataInicio(getDatLocal(inicio)); setDataFim(getDatLocal(fim)); setAtalhoAtivo(atalho.toLowerCase().trim()); } 
    else { setAtalhoAtivo(""); }
  };

  const fecharAtalho = () => {
    if (atalhoDebounceRef.current) clearTimeout(atalhoDebounceRef.current);
    setIsDatePickerOpen(false);
    setTextoInputData("");
  };

  const handleInputDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextoInputData(val);
    aplicarAtalho(val);
    if (atalhoDebounceRef.current) clearTimeout(atalhoDebounceRef.current);
    const codigo = val.toLowerCase().trim();
    if (CODIGOS_ATALHO.includes(codigo)) {
      // Espera um instante pro caso do código ainda poder virar um atalho maior (ex: "s" -> "sa").
      // Se nada mais for digitado nesse intervalo, aplica e fecha sozinho.
      atalhoDebounceRef.current = setTimeout(fecharAtalho, 500);
    }
  };
  const getDisplayPeriodo = () => {
    if (isDatePickerOpen) return textoInputData;
    if (atalhoAtivo && nomesAtalhos[atalhoAtivo]) return `${nomesAtalhos[atalhoAtivo]} (${formatarDataNormal(dataInicio)} a ${formatarDataNormal(dataFim)})`;
    return `De ${formatarDataNormal(dataInicio)} a ${formatarDataNormal(dataFim)}`;
  };

  const toggleTipo = (t: string) => setFiltroTipo((prev) => (prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]));
  const toggleUsuario = (nome: string) => setUsuariosSelecionados((prev) => (prev.includes(nome) ? prev.filter((u) => u !== nome) : [...prev, nome]));
  const limparFiltros = () => {
    const hoje = new Date();
    setDataInicio(getDatLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
    setDataFim(getDatLocal(hoje));
    setAtalhoAtivo("m");
    setTextoInputData("");
    setFiltroTipo(["receita", "despesa", "transferencia"]);
    setUsuariosSelecionados(usuariosDisponiveis);
    setFiltroCategoria("");
    setFiltroBanco("");
    setFiltroFormaPagto("");
    setSomenteMinhasContas(true);
  };

  const categoriasFiltradasModal = categorias
    .filter((c) => c.tipo === tipo)
    .sort((a, b) => {
      const aOutros = a.nome.toLowerCase().startsWith("outros");
      const bOutros = b.nome.toLowerCase().startsWith("outros");
      if (aOutros !== bOutros) return aOutros ? 1 : -1;
      return a.nome.localeCompare(b.nome);
    });

  const transacoesFiltradas = transacoes.filter((t) => {
    const dataOk = t.data >= dataInicio && t.data <= dataFim;
    const tipoOk = filtroTipo.includes(t.tipo);
    const usuarioOk = t.autor_nome === "Família" || usuariosSelecionados.includes(t.autor_nome || "Usuário");
    
    const categoriaOk = filtroCategoria === "" || t.categoria_id === filtroCategoria;
    const bancoOk = filtroBanco === "" || t.conta_origem?.banco_vinculado?.id === filtroBanco || t.conta_destino?.banco_vinculado?.id === filtroBanco;
    const contaOk = filtroFormaPagto === "" || t.conta_id === filtroFormaPagto || t.conta_destino_id === filtroFormaPagto;

    return dataOk && tipoOk && usuarioOk && categoriaOk && bancoOk && contaOk;
  });

  // Agrupa lançamentos parcelados (descrição "... (i/N)") pelo criado_em do
  // lote de insert — todas as parcelas de um mesmo parcelamento são
  // gravadas numa única chamada insert, então compartilham o mesmo
  // criado_em. Ignora o filtro de período: um parcelamento pode ter
  // parcelas em meses fora do intervalo selecionado no Extrato.
  const gruposParcelamento = (() => {
    const regexParcela = /^(.*) \((\d+)\/(\d+)\)$/;
    const grupos: Record<string, any> = {};
    transacoes.forEach((t) => {
      if (t.tipo === "transferencia") return;
      const m = t.descricao?.match(regexParcela);
      if (!m) return;
      const chave = String(t.criado_em);
      if (!grupos[chave]) {
        grupos[chave] = {
          id: chave,
          descricaoBase: m[1],
          totalParcelas: Number(m[3]),
          categoriaNome: t.categorias?.nome || "Sem categoria",
          contaNome: t.conta_origem?.nome || "—",
          autor_nome: t.autor_nome || "Usuário",
          itens: [] as any[],
        };
      }
      grupos[chave].itens.push(t);
    });
    return Object.values(grupos)
      .map((g: any) => {
        const itens = [...g.itens].sort((a: any, b: any) => a.data.localeCompare(b.data));
        return { ...g, itens, valorTotal: itens.reduce((acc: number, t: any) => acc + Number(t.valor), 0), primeiraData: itens[0]?.data || "" };
      })
      .filter((g: any) => g.autor_nome === "Família" || usuariosSelecionados.includes(g.autor_nome))
      .filter((g: any) => !buscaParcelamento || g.descricaoBase.toLowerCase().includes(buscaParcelamento.toLowerCase()))
      .sort((a: any, b: any) => b.primeiraData.localeCompare(a.primeiraData));
  })();

  const resumoFiltrado = transacoesFiltradas.reduce(
    (acc, t) => {
      const val = Number(t.valor);
      if (t.tipo === "receita") { acc.receitas += val; acc.saldo += val; } 
      else if (t.tipo === "despesa") { if (t.conta_origem?.tipo === "credito") acc.cartao += val; else { acc.despesasPagas += val; acc.saldo -= val; } } 
      else if (t.tipo === "transferencia") {
        if (t.conta_origem?.tipo !== "credito") acc.saldo -= val;
        if (t.conta_destino?.tipo === "credito"){
          acc.cartao -= val;
          acc.despesasPagas += val;
        } else if (t.conta_destino) {
          acc.saldo += val;
        }
      }
      return acc;
    },
    { saldo: 0, receitas: 0, despesasPagas: 0, cartao: 0 }
  );

  const cartoesCredito = contas.filter((c) => c.tipo === "credito");

  const obterFaturasDoCartao = (cartaoId: string) => {
    const cartao = contas.find(c => c.id === cartaoId);
    if (!cartao) return { totalGeral: 0, faturasAbertas: [] };

    const diaFechamento = Number(cartao.dia_fechamento) || 1; 
    const diaVencimento = Number(cartao.dia_vencimento) || 10;
    const transCartao = transacoes.filter(t => (t.tipo === 'despesa' && t.conta_id === cartaoId) || (t.tipo === 'transferencia' && t.conta_destino_id === cartaoId));
    
    let faturasAgrupadas: Record<string, number> = {}; let pagamentosTotais = 0;

    transCartao.forEach(t => {
       const val = Number(t.valor);
       if (t.tipo === 'despesa') {
          const [aStr, mStr, dStr] = t.data.split('-');
          let ano = Number(aStr); let mes = Number(mStr) - 1; const dia = Number(dStr);
          if (dia >= diaFechamento) { mes++; if (mes > 11) { mes = 0; ano++; } }
          const chave = `${ano}-${String(mes + 1).padStart(2, '0')}`;
          faturasAgrupadas[chave] = (faturasAgrupadas[chave] || 0) + val;
       } else if (t.tipo === 'transferencia') { pagamentosTotais += val; }
    });

    let faturasArray = Object.keys(faturasAgrupadas).sort().map(chave => {
        const [aStr, mStr] = chave.split('-');
        const anoNum = Number(aStr); const mesNum = Number(mStr) - 1;
        const dataVenc = new Date(anoNum, mesNum, diaVencimento);
        let dataFech = new Date(anoNum, mesNum, diaFechamento);
        if (diaVencimento < diaFechamento) dataFech = new Date(anoNum, mesNum - 1, diaFechamento);
        return { chave, dataVencimento: dataVenc, dataFechamento: dataFech, valorAberto: faturasAgrupadas[chave] };
    });

    let pagamentosRestantes = pagamentosTotais;
    for (let i = 0; i < faturasArray.length; i++) {
        if (pagamentosRestantes >= faturasArray[i].valorAberto) {
            pagamentosRestantes -= faturasArray[i].valorAberto; faturasArray[i].valorAberto = 0;
        } else { faturasArray[i].valorAberto -= pagamentosRestantes; pagamentosRestantes = 0; break; }
    }

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const faturasPendentes = faturasArray.filter(f => f.valorAberto > 0.01).map(f => {
        let status = "Em Aberto";
        if (hoje > f.dataVencimento) status = "Atrasada"; else if (hoje >= f.dataFechamento) status = "Fechada";
        return { ...f, status, labelVencimento: `${String(f.dataVencimento.getDate()).padStart(2, '0')}/${String(f.dataVencimento.getMonth() + 1).padStart(2, '0')}/${f.dataVencimento.getFullYear()}` };
    });

    faturasPendentes.reverse();
    return { totalGeral: faturasPendentes.reduce((acc, f) => acc + f.valorAberto, 0), faturasAbertas: faturasPendentes };
  };

  const saldosBancarios = bancos.map((banco) => {
    const chavesDoBanco = contas.filter((c) => c.conta_bancaria_id === banco.id && c.tipo === "corrente");
    const idsChaves = chavesDoBanco.map((c) => c.id);
    let saldo = 0;
    transacoes.forEach((t) => {
      const v = Number(t.valor);
      if (t.tipo === "receita" && idsChaves.includes(t.conta_id)) saldo += v;
      if (t.tipo === "despesa" && idsChaves.includes(t.conta_id)) saldo -= v;
      if (t.tipo === "transferencia") {
        if (idsChaves.includes(t.conta_id)) saldo -= v;
        if (idsChaves.includes(t.conta_destino_id)) saldo += v;
      }
    });
    return { ...banco, saldo };
  });

  const saldosBancariosOrdenados = [...saldosBancarios].sort((a, b) => {
    const autorA = a.autor_nome || ""; const autorB = b.autor_nome || "";
    if (autorA !== autorB) return autorA.localeCompare(autorB);
    const bancoA = a.banco || ""; const bancoB = b.banco || "";
    return bancoA.localeCompare(bancoB);
  });

  const saldoDinheiroFisico = (() => {
    const chavesDinheiro = contas.filter((c) => c.tipo === "dinheiro");
    const idsDinheiro = chavesDinheiro.map((c) => c.id);
    let saldo = 0;
    transacoes.forEach((t) => {
      const v = Number(t.valor);
      if (t.tipo === "receita" && idsDinheiro.includes(t.conta_id)) saldo += v;
      if (t.tipo === "despesa" && idsDinheiro.includes(t.conta_id)) saldo -= v;
      if (t.tipo === "transferencia") {
        if (idsDinheiro.includes(t.conta_id)) saldo -= v;
        if (idsDinheiro.includes(t.conta_destino_id)) saldo += v;
      }
    });
    return saldo;
  })();

  const saldoTotalReal = saldoDinheiroFisico + saldosBancarios.reduce((acc, b) => acc + (b.ativo !== false && usuariosSelecionados.includes(b.autor_nome) ? b.saldo : 0), 0);
  const totalCartoesGeral = cartoesCredito.reduce((acc, cartao) => {
    if (cartao.ativo !== false && usuariosSelecionados.includes(cartao.autor_nome)) return acc + obterFaturasDoCartao(cartao.id).totalGeral;
    return acc;
  }, 0);

  const getContaAvatar = (c: any) => {
    const foto = mapPerfis[c.autor_nome];
    if (c.tipo === "dinheiro") return { photo: null, char: "💵", bg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" };
    if (c.tipo === "credito") return { photo: foto, char: c.autor_nome?.charAt(0).toUpperCase() || "C", bg: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400" };
    return { photo: foto, char: c.autor_nome?.charAt(0).toUpperCase() || "B", bg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" };
  };

  const getContaSubtitle = (c: any) => {
    if (c.tipo === "dinheiro") return "Na Carteira / Cofre";
    if (c.tipo === "corrente" && c.subtipo === "pix") return `PIX: ${c.chave_pix}`;
    if (c.tipo === "credito" || (c.tipo === "corrente" && c.subtipo === "debito")) return `FINAL ${c.ultimos_digitos || "----"}`;
    return "";
  };

  const getChavePrincipalDoBanco = (bancoOuDinheiroId: string) => {
    if (bancoOuDinheiroId === "dinheiro") {
      const din = contas.find((c) => c.tipo === "dinheiro" && c.ativo !== false);
      return din ? din.id : null;
    }
    const chave = contas.find((c) => c.conta_bancaria_id === bancoOuDinheiroId && c.tipo === "corrente" && c.ativo !== false);
    return chave ? chave.id : null;
  };

  const resetFields = () => {
    setEditandoId(null); setValor(""); setData(getDatLocal(new Date())); setDescricao("");
    setCategoriaId(""); setParcelas(1); setModoParcelamento("ultima"); setValoresParcelasManual([]); setIsPagamentoFatura(false); setFormaPagtoId("");
    setBancoOrigemId(""); setBancoDestinoId(""); setFaturaDestinoId(""); closeAllDropdowns();
    setVinculoContaFixa(null); setOcorrenciaOriginalVinculada(null); setDescricaoTocada(false); setContasFixasSugestoes([]);
  };

  const abrirModalNovoLancamento = () => { resetFields(); setTipo("despesa"); setIsModalOpen(true); };

  const abrirModalEditar = async (t: any) => {
    if (t.user_id !== userId) { showIsland("Apenas o autor pode editar este lançamento.", "error", "🛑"); return; }
    resetFields();
    setEditandoId(t.id); setTipo(t.tipo); setValor(t.valor.toString()); setData(t.data);
    setDescricao(t.descricao); setCategoriaId(t.categoria_id || "");
    setDescricaoTocada(true);

    if (t.tipo === "despesa") {
      setFormaPagtoId(t.conta_id || "");
      const { data: ocVinculada } = await supabase.from("contas_fixas_ocorrencias").select("*").eq("transacao_id", t.id).maybeSingle();
      if (ocVinculada) {
        setOcorrenciaOriginalVinculada(ocVinculada);
        setVinculoContaFixa({ contaFixaId: ocVinculada.conta_fixa_id, ocorrenciaId: ocVinculada.id });
      }
    }
    else if (t.tipo === "receita") {
      const c = contas.find((x) => x.id === t.conta_id);
      setBancoOrigemId(c?.tipo === "dinheiro" ? "dinheiro" : c?.conta_bancaria_id || "");
    } else if (t.tipo === "transferencia") {
      const cOrigem = contas.find((x) => x.id === t.conta_id);
      setBancoOrigemId(cOrigem?.tipo === "dinheiro" ? "dinheiro" : cOrigem?.conta_bancaria_id || "");
      setFormaPagtoId(t.conta_id || "");

      const cDest = contas.find((x) => x.id === t.conta_destino_id);
      if (cDest?.tipo === "credito") { setIsPagamentoFatura(true); setFaturaDestinoId(cDest.id); }
      else { setIsPagamentoFatura(false); setBancoDestinoId(cDest?.tipo === "dinheiro" ? "dinheiro" : cDest?.conta_bancaria_id || ""); }
    }
    setTransacaoAlvo(t); setIsModalOpen(true);
  };

  const dispararAuditoriaAtualizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tipo === "despesa" && !formaPagtoId) { showIsland("Selecione a forma de pagamento!", "error", "🛑"); return; }
    if (tipo === "receita" && !bancoOrigemId) { showIsland("Selecione onde recebeu!", "error", "🛑"); return; }
    if (tipo === "transferencia") {
      if (!bancoOrigemId || !formaPagtoId) { showIsland("Preencha a origem completa!", "error", "🛑"); return; }
      if (isPagamentoFatura && !faturaDestinoId) { showIsland("Selecione a fatura!", "error", "🛑"); return; }
      if (!isPagamentoFatura && !bancoDestinoId) { showIsland("Selecione o banco de destino!", "error", "🛑"); return; }
      if (!isPagamentoFatura && bancoOrigemId === bancoDestinoId) { showIsland("Origem e destino devem ser diferentes!", "error", "🛑"); return; }
    }

    if (editandoId) {
      setMotivoAuditoria(""); setPalavraConfirmacao(""); setIsModalOpen(false); setIsUpdateModalOpen(true);
      const trintaDiasAtras = new Date(); trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      const { data: atualizadas } = await supabase.from("transacoes_atualizadas").select("motivo").eq("user_id", userId).gte("atualizado_em", trintaDiasAtras.toISOString());
      if (atualizadas && atualizadas.length > 0) {
        const contagem: Record<string, number> = {};
        atualizadas.forEach((t) => contagem[t.motivo] = (contagem[t.motivo] || 0) + 1);
        setMotivosFrequentes(Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 3).map((i) => i[0]));
      } else setMotivosFrequentes([]);
    } else executarSalvarTransacaoBD();
  };

  const executarSalvarTransacaoBD = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessingAudit(true);
    const valorNumerico = parseFloat(valor.replace(",", "."));
    let dbContaId = null; let dbContaDestinoId = null;

    if (tipo === "despesa") dbContaId = formaPagtoId;
    if (tipo === "receita") dbContaId = getChavePrincipalDoBanco(bancoOrigemId);
    if (tipo === "transferencia") { dbContaId = formaPagtoId; dbContaDestinoId = isPagamentoFatura ? faturaDestinoId : getChavePrincipalDoBanco(bancoDestinoId); }

    if (!dbContaId) { showIsland("Forma de pagamento inválida.", "error", "🛑"); setIsProcessingAudit(false); return; }
    if (tipo === "transferencia" && !dbContaDestinoId) { showIsland("Conta destino inválida.", "error", "🛑"); setIsProcessingAudit(false); return; }

    const payloadBase = { user_id: userId, autor_nome: username || "Usuário", tipo, categoria_id: tipo === "transferencia" ? null : categoriaId, conta_id: dbContaId, conta_destino_id: dbContaDestinoId };

    let novoTransacaoId: string | null = null;

    if (editandoId) {
      await supabase.from("transacoes_atualizadas").insert([{ transacao_id: editandoId, descricao: transacaoAlvo.descricao, valor: transacaoAlvo.valor, data: transacaoAlvo.data, tipo: transacaoAlvo.tipo, categoria_id: transacaoAlvo.categoria_id, conta_id: transacaoAlvo.conta_id, conta_destino_id: transacaoAlvo.conta_destino_id, user_id: transacaoAlvo.user_id, autor_nome: transacaoAlvo.autor_nome, atualizado_por_nome: username || "Usuário", motivo: motivoAuditoria }]);
      const { error } = await supabase.from("transacoes").update({ ...payloadBase, descricao, valor: valorNumerico, data }).eq("id", editandoId);
      if (error) { showIsland("Erro ao atualizar: " + error.message, "error", "🛑"); setIsProcessingAudit(false); return; }
      showIsland("Atualizado com sucesso!", "success", "✏️");
      novoTransacaoId = editandoId;
    } else {
      if (tipo !== "transferencia" && parcelas > 1) {
        let valoresParcelas: number[];
        if (modoParcelamento === "manual") {
          valoresParcelas = valoresParcelasManual.map((v) => parseFloat((v || "0").replace(",", ".")) || 0);
          const somaManual = Number(valoresParcelas.reduce((acc, v) => acc + v, 0).toFixed(2));
          if (Math.abs(somaManual - valorNumerico) > 0.01) {
            showIsland(`A soma das parcelas (R$ ${somaManual.toFixed(2)}) não bate com o valor total (R$ ${valorNumerico.toFixed(2)}).`, "error", "🛑");
            setIsProcessingAudit(false);
            return;
          }
        } else {
          const vBase = Math.floor((valorNumerico / parcelas) * 100) / 100;
          const diferenca = Number((valorNumerico - vBase * parcelas).toFixed(2));
          valoresParcelas = Array.from({ length: parcelas }, (_, i) => {
            if (modoParcelamento === "primeira" && i === 0) return Number((vBase + diferenca).toFixed(2));
            if (modoParcelamento === "ultima" && i === parcelas - 1) return Number((vBase + diferenca).toFixed(2));
            return vBase;
          });
        }
        const payloadsMultiplos = [];
        for (let i = 0; i < parcelas; i++) {
          const [a, m, d] = data.split("-").map(Number);
          const dP = new Date(a, m - 1 + i, d);
          if (dP.getMonth() !== (m - 1 + i) % 12) dP.setDate(0);
          payloadsMultiplos.push({ ...payloadBase, descricao: `${descricao} (${i + 1}/${parcelas})`, valor: valoresParcelas[i], data: `${dP.getFullYear()}-${String(dP.getMonth() + 1).padStart(2, "0")}-${String(dP.getDate()).padStart(2, "0")}` });
        }
        await supabase.from("transacoes").insert(payloadsMultiplos);
        showIsland(`${parcelas} parcelas salvas!`, "success", "📅");
      } else {
        const { data: inserida, error } = await supabase.from("transacoes").insert([{ ...payloadBase, descricao, valor: valorNumerico, data }]).select("id").single();
        if (error) { showIsland("Erro ao salvar: " + error.message, "error", "🛑"); setIsProcessingAudit(false); return; }
        novoTransacaoId = inserida?.id || null;
        showIsland("Lançamento salvo com sucesso!", "success", "🎉");
      }
    }

    // Vínculo com conta fixa (só se aplica a despesa avulsa, sem parcelamento)
    if (editandoId && ocorrenciaOriginalVinculada) {
      const mantemMesmoVinculo = tipo === "despesa" && vinculoContaFixa?.ocorrenciaId === ocorrenciaOriginalVinculada.id;
      if (!mantemMesmoVinculo) {
        await supabase.from("contas_fixas_ocorrencias").update({ status: "pendente", transacao_id: null }).eq("id", ocorrenciaOriginalVinculada.id);
      }
    }
    if (tipo === "despesa" && parcelas === 1 && novoTransacaoId && vinculoContaFixa) {
      const [ano, mes] = data.split("-").map(Number);
      if (vinculoContaFixa.ocorrenciaId) {
        await supabase.from("contas_fixas_ocorrencias").update({ status: "pago", transacao_id: novoTransacaoId, valor: valorNumerico, data_pagamento: data }).eq("id", vinculoContaFixa.ocorrenciaId);
      } else {
        const { error: ocError } = await supabase.from("contas_fixas_ocorrencias").insert([{ conta_fixa_id: vinculoContaFixa.contaFixaId, competencia_ano: ano, competencia_mes: mes, status: "pago", valor: valorNumerico, transacao_id: novoTransacaoId, data_pagamento: data, user_id: userId, autor_nome: username || "Usuário" }]);
        if (ocError) {
          if (ocError.code === "23505") showIsland("Lançamento salvo, mas já existia uma ocorrência para esse mês nessa conta fixa.", "error", "🛑");
          else showIsland("Lançamento salvo, mas houve erro ao vincular a conta fixa: " + ocError.message, "error", "🛑");
        }
      }
    }

    setIsProcessingAudit(false); setIsUpdateModalOpen(false); setIsModalOpen(false); carregarDados(false);
  };

  const abrirModalDeExclusao = async () => {
    setMotivoAuditoria(""); setPalavraConfirmacao(""); setIsModalOpen(false); setIsDeleteModalOpen(true);
    const trintaDiasAtras = new Date(); trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const { data: excluidas } = await supabase.from("transacoes_excluidas").select("motivo").eq("user_id", userId).gte("excluido_em", trintaDiasAtras.toISOString());
    if (excluidas && excluidas.length > 0) {
      const contagem: Record<string, number> = {};
      excluidas.forEach((t) => contagem[t.motivo] = (contagem[t.motivo] || 0) + 1);
      setMotivosFrequentes(Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 3).map((i) => i[0]));
    } else setMotivosFrequentes([]);
  };

  const confirmarExclusaoComAuditoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (palavraConfirmacao.toLowerCase() !== "excluir") return;
    setIsProcessingAudit(true);
    await supabase.from("transacoes_excluidas").insert([{ transacao_id: transacaoAlvo.id, descricao: transacaoAlvo.descricao, valor: transacaoAlvo.valor, data: transacaoAlvo.data, tipo: transacaoAlvo.tipo, categoria_id: transacaoAlvo.categoria_id, conta_id: transacaoAlvo.conta_id, conta_destino_id: transacaoAlvo.conta_destino_id, user_id: transacaoAlvo.user_id, autor_nome: transacaoAlvo.autor_nome, excluido_por_nome: username || "Usuário", motivo: motivoAuditoria }]);
    await supabase.from("contas_fixas_ocorrencias").update({ status: "pendente", transacao_id: null }).eq("transacao_id", transacaoAlvo.id);
    await supabase.from("transacoes").delete().eq("id", transacaoAlvo.id);
    setIsProcessingAudit(false); showIsland("Excluído com sucesso!", "success", "🗑️"); setIsDeleteModalOpen(false); carregarDados(false);
  };

  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";

  return (
    <>
      <style>{`
        /* DYNAMIC ISLAND 2.0 (BALLOON INFLATE/POP) */
        @keyframes balloonInflate {
          0% { transform: translateY(-50px) scale(0.3); opacity: 0; filter: blur(10px); }
          60% { transform: translateY(5px) scale(1.05); opacity: 1; filter: blur(0px); }
          100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0px); }
        }
        @keyframes balloonPop {
          0% { transform: scale(1); opacity: 1; filter: blur(0px); }
          40% { transform: scale(1.15); opacity: 0.8; filter: blur(2px); }
          100% { transform: scale(0); opacity: 0; filter: blur(10px); }
        }
        .animate-balloon-inflate { animation: balloonInflate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-balloon-pop { animation: balloonPop 0.4s cubic-bezier(0.36, -0.24, 0.86, 1.3) forwards; }

        /* EFEITO MAC DOCK WAVE */
        @keyframes macDockWave { 
          0% { transform: translateY(0) scale(1); } 
          40% { transform: translateY(-16px) scale(1.03); } 
          70% { transform: translateY(4px) scale(0.98); } 
          100% { transform: translateY(0) scale(1); } 
        }
        .mac-dock-item { will-change: transform; }
        .mac-dock-animate { animation: macDockWave 0.6s cubic-bezier(0.25, 1, 0.5, 1) both; }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative pb-20 overflow-x-hidden transition-colors duration-300">
        
        {/* DYNAMIC ISLAND CENTRALIZADA (LIQUID GLASS + EMOJI) */}
        {island.show && (
          <div className="fixed top-6 left-0 w-full z-[100] flex justify-center pointer-events-none">
            <div className={`pointer-events-auto px-5 py-3 rounded-full backdrop-blur-3xl border flex items-center justify-center gap-3 w-auto min-w-[250px] max-w-[90%] transition-colors duration-300 ${island.isClosing ? 'animate-balloon-pop' : 'animate-balloon-inflate'} ${
              island.type === 'error' ? 'bg-white/70 dark:bg-black/60 border-red-200 dark:border-red-900/50 shadow-[0_8px_32px_rgba(239,68,68,0.25)] text-red-800 dark:text-red-300' :
              island.type === 'success' ? 'bg-white/70 dark:bg-black/60 border-emerald-200 dark:border-emerald-900/50 shadow-[0_8px_32px_rgba(16,185,129,0.25)] text-emerald-800 dark:text-emerald-300' :
              'bg-white/70 dark:bg-black/60 border-blue-200 dark:border-blue-900/50 shadow-[0_8px_32px_rgba(59,130,246,0.25)] text-blue-800 dark:text-blue-300'
            }`}>
              <span className="text-xl shrink-0 drop-shadow-md">{island.icon}</span>
              <span className="text-sm font-black tracking-tight whitespace-nowrap">{island.message}</span>
            </div>
          </div>
        )}

        {/* NAVBAR UNIFICADA */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center relative z-10 transition-colors">
          <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">Controle Financeiro</h1>
          <div className="flex items-center">
            
            <button onClick={toggleVisibilidadeGlobal} className="mr-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none" title="Ocultar valores">
              {visibilidade.global ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              )}
            </button>

            <button onClick={toggleTheme} className="relative inline-flex items-center h-7 w-14 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors mr-4 focus:outline-none" title="Modo Escuro">
              <span className="absolute left-2 text-[10px]">🌙</span><span className="absolute right-2 text-[10px]">☀️</span>
              <span className={`inline-block w-5 h-5 transform rounded-full bg-white shadow-sm transition-transform z-10 ${isDarkMode ? "translate-x-8" : "translate-x-1"}`} />
            </button>

            <div className="flex flex-col items-end mr-4 hidden sm:flex">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">@{username || "usuario"}</span>
              {fullName && <span className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{fullName}</span>}
            </div>
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-lg font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 overflow-hidden border-2 border-white dark:border-gray-800">
                {avatarUrl ? <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" /> : initialLetterMenu}
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-2 space-y-1">
                      <button onClick={() => router.push("/dashboard")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">📊 Dashboard</button>
                      <button onClick={() => router.push("/insights")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">💡 Insights</button>
                      <button onClick={() => router.push("/investimentos")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">💰 Gestão de Patrimônio</button>
                      <button onClick={() => router.push("/contas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏦 Gestão Bancária</button>
                      <button onClick={() => router.push("/contas-fixas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">📌 Contas Fixas</button>
                      <button onClick={() => router.push("/assinaturas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🔁 Assinaturas</button>
                      <button onClick={() => router.push("/categorias")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏷️ Categorias</button>
                      <button onClick={() => router.push("/auditoria")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🗑️ Auditoria de Lançamentos</button>
                      <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>
                      <button onClick={() => router.push("/perfil")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">⚙️ Meu Perfil</button>
                      <button onClick={() => router.push("/parametros")} className="w-full text-left px-4 py-2.5 text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors">⚙️ Parâmetros do Sistema</button>
                      <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Sair do Sistema</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="p-6 max-w-6xl mx-auto space-y-6 mt-4 relative z-0">
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Visão Geral</h2>
            <button onClick={abrirModalNovoLancamento} className="hidden md:flex items-center gap-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95">
              <span className="text-xl leading-none">+</span> Novo Lançamento
            </button>
          </div>

          {/* 1. SEÇÃO DE FILTROS - COM A ONDA (DELAY 0s) */}
          <div className={`relative z-30 bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col space-y-4 transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
              <div className="relative w-full lg:w-1/3 shrink-0">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Período (Digite o Atalho)</label>
                <input type="text" value={getDisplayPeriodo()} onFocus={() => { if (atalhoDebounceRef.current) clearTimeout(atalhoDebounceRef.current); setIsDatePickerOpen(true); setTextoInputData(atalhoAtivo); }} onChange={handleInputDataChange} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); fecharAtalho(); } }} placeholder="Ex: m, h, sa..." className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer" />
                {isDatePickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={fecharAtalho}></div>
                    <div className="absolute top-[100%] mt-2 left-0 w-full sm:w-[450px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-5 z-50">
                      <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Atalhos Rápidos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                        {Object.entries(nomesAtalhos).map(([key, name]) => (
                          <button key={key} type="button" onClick={() => { aplicarAtalho(key); fecharAtalho(); }} className={`text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${atalhoAtivo === key ? "bg-blue-600 text-white shadow-md scale-105" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${atalhoAtivo === key ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"}`}>{key}</span>
                            <span className="text-center">{name}</span>
                          </button>
                        ))}
                      </div>
                      <div className="h-px bg-gray-100 dark:bg-gray-700 mb-4"></div>
                      <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Ou Selecione no Calendário</p>
                      <div className="flex gap-3">
                        <div className="flex-1"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Inicial</label><input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setAtalhoAtivo(""); }} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500" /></div>
                        <div className="flex-1"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Final</label><input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setAtalhoAtivo(""); }} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500" /></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="hidden lg:block w-px h-12 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
              <div className="block lg:hidden w-full h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
              <div className="w-full lg:w-1/4 shrink-0">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Tipo</label>
                <div className="flex gap-2">
                  <button onClick={() => toggleTipo("receita")} className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 border ${filtroTipo.includes("receita") ? "bg-green-600 text-white border-green-600 shadow-md" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>Receitas</button>
                  <button onClick={() => toggleTipo("despesa")} className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 border ${filtroTipo.includes("despesa") ? "bg-red-600 text-white border-red-600 shadow-md" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>Despesas</button>
                  <button onClick={() => toggleTipo("transferencia")} className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 border ${filtroTipo.includes("transferencia") ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>Transf.</button>
                </div>
              </div>
              <div className="hidden lg:block w-px h-12 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
              <div className="block lg:hidden w-full h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
              <div className="w-full lg:flex-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Usuários</label>
                <div className="flex flex-wrap gap-2">
                  {isLoadingData ? <span className="text-sm text-gray-400 font-medium py-2">Carregando...</span> : usuariosDisponiveis.length === 0 ? <span className="text-sm text-gray-400 font-medium py-2">Nenhum usuário</span> : (
                    usuariosDisponiveis.map((user) => {
                      const isSelected = usuariosSelecionados.includes(user);
                      const fotoUser = mapPerfis[user];
                      return (
                        <button key={user} onClick={() => toggleUsuario(user)} className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all active:scale-95 flex items-center gap-2 ${isSelected ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-md" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center text-[10px]">
                            {fotoUser ? <img src={fotoUser} className="w-full h-full object-cover" alt="" /> : user.charAt(0).toUpperCase()}
                          </div>{user}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="h-px w-full bg-gray-100 dark:bg-gray-700 my-2"></div>
            
            <div className="flex flex-col sm:flex-row gap-5 items-end">
              <div className="w-full sm:flex-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Filtrar por Categoria</label>
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todas as Categorias</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="w-full sm:flex-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Filtrar por Banco / Instituição</label>
                <select value={filtroBanco} onChange={(e) => setFiltroBanco(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos os Bancos</option>
                  {[...bancos].sort((a,b) => {
                    const autorA = a.autor_nome || "";
                    const autorB = b.autor_nome || "";
                    if (autorA !== autorB) return autorA.localeCompare(autorB);
                    const bancoA = a.banco || "";
                    const bancoB = b.banco || "";
                    return bancoA.localeCompare(bancoB);
                  }).map(b => (
                    <option key={b.id} value={b.id}>@{b.autor_nome} • {b.banco}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:flex-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Filtrar por Pagamento</label>
                <select value={filtroFormaPagto} onChange={(e) => setFiltroFormaPagto(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todas as Formas de Pagamento</option>
                  {contas
                    .filter((c) => filtroBanco === "" || c.conta_bancaria_id === filtroBanco)
                    .map (c => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.banco_vinculado ? `(${c.banco_vinculado.banco})` : ""}
                      </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-auto shrink-0">
                <button 
                  onClick={limparFiltros}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-gray-700 rounded-xl transition-all flex items-center justify-center gap-2 h-[42px] active:scale-95"
                  title="Restaurar visualização padrão"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {/* 2. SEÇÃO DE SALDOS BANCÁRIOS E COFRES - COM A ONDA (DELAY 0.1s) */}
          {!isLoadingData && (
            <div className={`pt-2 animate-in fade-in duration-300 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 ml-1 gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Meus Bancos & Cofres</h3>
                  <button onClick={() => toggleVisibilidadeBloco('saldos')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none">
                    {visibilidade.saldos ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    )}
                  </button>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-4 py-2 rounded-xl flex items-center gap-3">
                   <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Saldo Total Real:</span>
                   <span className="text-lg font-black text-blue-700 dark:text-blue-300">{formatarMoeda(saldoTotalReal, visibilidade.saldos)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xs">💵</div>
                    <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider truncate">Carteira / Casa</span>
                  </div>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 truncate">{formatarMoeda(saldoDinheiroFisico, visibilidade.saldos)}</p>
                </div>
                
                {saldosBancariosOrdenados.map((banco) => {
                  if (banco.ativo === false || !usuariosSelecionados.includes(banco.autor_nome)) return null;
                  const fotoBanco = mapPerfis[banco.autor_nome];
                  return (
                    <div key={banco.id} className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden">
                            {fotoBanco ? <img src={fotoBanco} alt="" className="w-full h-full object-cover" /> : banco.autor_nome?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider truncate block">{banco.banco}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider mb-2 truncate block w-full">{banco.nome}</span>
                      <p className={`text-lg font-black truncate ${banco.saldo < 0 ? "text-red-600 dark:text-red-400" : "text-blue-700 dark:text-blue-400"}`}>
                        {formatarMoeda(banco.saldo, visibilidade.saldos)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. SEÇÃO DE RESUMO DO PERÍODO - COM A ONDA (DELAY 0.15s) */}
          <div className={`pt-2 animate-in fade-in duration-300 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-3 mb-4 ml-1">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Resumo do Período</h3>
              <button onClick={() => toggleVisibilidadeBloco('resumo')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none">
                {visibilidade.resumo ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center transition-colors">
                <h3 className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Saldo Líquido <span className="lowercase text-gray-400 dark:text-gray-500 font-medium">(do período)</span></h3>
                <p className={`text-3xl font-black mt-2 truncate ${resumoFiltrado.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>{formatarMoeda(resumoFiltrado.saldo, visibilidade.resumo)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center transition-colors">
                <h3 className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Receitas <span className="lowercase text-gray-400 dark:text-gray-500 font-medium">(do período)</span></h3>
                <p className="text-3xl font-black text-green-500 dark:text-green-400 mt-2 truncate">{formatarMoeda(resumoFiltrado.receitas, visibilidade.resumo)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center transition-colors">
                <h3 className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Despesas Pagas <span className="lowercase text-gray-400 dark:text-gray-500 font-medium">(do período)</span></h3>
                <p className="text-3xl font-black text-red-500 dark:text-red-400 mt-2 truncate">{formatarMoeda(resumoFiltrado.despesasPagas, visibilidade.resumo)}</p>
              </div>
            </div>
          </div>

          {/* 4. ÁREA DE CARTÕES DE CRÉDITO - COM A ONDA (DELAY 0.2s) */}
          <div className={`bg-purple-50/40 dark:bg-purple-900/10 p-6 sm:p-8 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-900/30 flex flex-col w-full mt-4 transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.2s' }}>
            
            {(() => {
              // Lógica para calcular os 4 grandes totais do cabeçalho
              let globalGastoCredito = 0;
              let globalFechado = 0;
              let globalAtrasado = 0;
              let globalMesAtual = 0;

              cartoesCredito.forEach(cartao => {
                if (cartao.ativo !== false && usuariosSelecionados.includes(cartao.autor_nome)) {
                  const { faturasAbertas } = obterFaturasDoCartao(cartao.id);
                  faturasAbertas.forEach(f => {
                    globalGastoCredito += f.valorAberto;
                    if (f.status === 'Fechada') globalFechado += f.valorAberto;
                    if (f.status === 'Atrasada') globalAtrasado += f.valorAberto;
                  });
                  // Fatura "Atual" = a primeira Em Aberto em ordem cronológica de vencimento
                  // (mesma regra usada no card individual de cada cartão).
                  const faturaAtualCartao = [...faturasAbertas].sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime()).find(f => f.status === 'Em Aberto');
                  if (faturaAtualCartao) globalMesAtual += faturaAtualCartao.valorAberto;
                }
              });

              return (
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-5 border-b border-purple-100/50 dark:border-purple-800/30 pb-6">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm text-purple-800 dark:text-purple-400 font-black uppercase tracking-wider flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> 
                        Faturas (Cartão de Crédito)
                      </h3>
                      <p className="text-xs text-purple-600/70 dark:text-purple-400/70 font-bold mt-1">Dívida total acumulada</p>
                    </div>
                    <button onClick={() => toggleVisibilidadeBloco('cartoes')} className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 transition-colors focus:outline-none mb-1">
                      {visibilidade.cartoes ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <div className="flex-1 xl:flex-none bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 text-center xl:text-right">
                      <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider block mb-0.5">Em Atraso</span>
                      <span className="text-lg font-black text-red-600 dark:text-red-400">{formatarMoeda(globalAtrasado, visibilidade.cartoes)}</span>
                    </div>
                    <div className="flex-1 xl:flex-none bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/30 text-center xl:text-right">
                      <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider block mb-0.5">Fatura Fechada</span>
                      <span className="text-lg font-black text-blue-600 dark:text-blue-400">{formatarMoeda(globalFechado, visibilidade.cartoes)}</span>
                    </div>
                    <div className="flex-1 xl:flex-none bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 text-center xl:text-right">
                      <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">Total do Mês (Aberta)</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatarMoeda(globalMesAtual, visibilidade.cartoes)}</span>
                    </div>
                    <div className="flex-1 xl:flex-none bg-purple-600 dark:bg-purple-500 px-4 py-2.5 rounded-xl shadow-sm border border-purple-500 dark:border-purple-400 text-center xl:text-right min-w-[170px]">
                      <span className="text-[10px] font-bold text-purple-100 uppercase tracking-wider block mb-0.5">Total Gasto em Crédito</span>
                      <span className="text-xl font-black text-white">{formatarMoeda(globalGastoCredito, visibilidade.cartoes)}</span>
                    </div>
                  </div>
                </div>
              )
            })()}
            
            {cartoesCredito.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cartoesCredito.map((cartao) => {
                  const { totalGeral, faturasAbertas } = obterFaturasDoCartao(cartao.id);
                  if ((!usuariosSelecionados.includes(cartao.autor_nome) && totalGeral <= 0) || (cartao.ativo === false && totalGeral <= 0)) return null;
                  
                  const fotoCartao = mapPerfis[cartao.autor_nome];

                  // Identifica a fatura ATUAL (A primeira "Em Aberto" em ordem cronológica de vencimento)
                  const faturasOrdenadas = [...faturasAbertas].sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());
                  const faturaAtual = faturasOrdenadas.find(f => f.status === 'Em Aberto');
                  const chaveFaturaAtual = faturaAtual ? faturaAtual.chave : null;

                  return (
                    <div key={cartao.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-purple-100 dark:border-purple-800/30 shadow-sm flex flex-col hover:border-purple-300 dark:hover:border-purple-600 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-black shrink-0 overflow-hidden">
                            {fotoCartao ? <img src={fotoCartao} alt="" className="w-full h-full object-cover" /> : cartao.autor_nome?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{cartao.nome}</span>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">
                              Fecha dia {cartao.dia_fechamento || "1"} • Vence dia {cartao.dia_vencimento || "10"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total do Cartão</p>
                        <p className="text-3xl font-black text-purple-700 dark:text-purple-400">{formatarMoeda(totalGeral, visibilidade.cartoes)}</p>
                      </div>

                      {faturasAbertas.length > 0 && (
                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50 space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Faturas por Mês:</p>
                            {faturasAbertas.length > qtdFaturasVisiveis && (
                              <button type="button" onClick={() => setCartoesExpandidos((prev) => ({ ...prev, [cartao.id]: !prev[cartao.id] }))} className="text-[10px] font-black text-purple-600 dark:text-purple-400 hover:underline">
                                {cartoesExpandidos[cartao.id] ? "Ver menos" : `Ver mais ${faturasAbertas.length - qtdFaturasVisiveis}`}
                              </button>
                            )}
                          </div>

                          {(cartoesExpandidos[cartao.id] ? faturasAbertas : faturasAbertas.slice(-qtdFaturasVisiveis)).map(f => {
                            const isAtrasada = f.status === 'Atrasada';
                            const isFechada = f.status === 'Fechada';
                            const isAtual = f.chave === chaveFaturaAtual;
                            const isFutura = f.status === 'Em Aberto' && !isAtual;
                            
                            // Lógica do Calendário (Transforma "2026-05" em "MAI" e "05")
                            const mesFatura = f.chave.split('-')[1];
                            const mesesAbrev = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                            const mesNome = mesesAbrev[parseInt(mesFatura) - 1];

                            return (
                              <div key={f.chave} className={`flex justify-between items-center p-2.5 rounded-xl border transition-all ${isAtual ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 shadow-sm' : isAtrasada ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700/50'}`}>
                                
                                <div className="flex items-center gap-3">
                                  {/* NOVO: ÍCONE DE CALENDÁRIO DINÂMICO */}
                                  <div className={`flex flex-col items-center justify-center w-9 h-9 rounded-lg border shadow-sm relative overflow-hidden shrink-0 ${isAtrasada ? 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-800' : isFechada ? 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800' : isAtual ? 'bg-white dark:bg-gray-800 border-emerald-300 dark:border-emerald-600' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                    <div className={`w-full h-3.5 flex items-center justify-center text-[7px] font-black uppercase text-white tracking-widest ${isAtrasada ? 'bg-red-500' : isFechada ? 'bg-blue-500' : isAtual ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                                      {mesNome}
                                    </div>
                                    <div className={`flex-1 flex items-center justify-center text-xs font-black ${isAtrasada ? 'text-red-700 dark:text-red-400' : isFechada ? 'text-blue-700 dark:text-blue-400' : isAtual ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                      {mesFatura}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col">
                                    <span className={`text-[11px] font-bold ${isAtual ? 'text-emerald-900 dark:text-emerald-300' : isAtrasada ? 'text-red-900 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>Venc. {f.labelVencimento}</span>
                                    <span className={`text-[9px] font-black uppercase tracking-wider ${isAtrasada ? 'text-red-600 dark:text-red-400' : isFechada ? 'text-blue-600 dark:text-blue-400' : isAtual ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                      {isAtual ? 'Fatura Atual (Aberta)' : isFutura ? 'Fatura Futura' : f.status}
                                    </span>
                                  </div>
                                </div>

                                <span className={`text-sm font-black ${isAtual ? 'text-emerald-700 dark:text-emerald-400' : isAtrasada ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {formatarMoeda(f.valorAberto, visibilidade.cartoes)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/60 dark:bg-gray-800/60 p-6 rounded-xl border border-purple-100 dark:border-purple-900/30 border-dashed flex flex-col items-center justify-center text-center py-10">
                <span className="text-3xl mb-2 opacity-50">💳</span>
                <p className="text-sm font-bold text-purple-500 dark:text-purple-400">Nenhum cartão de crédito ativo.</p>
              </div>
            )}
          </div>

          {/* 5. LISTAGEM DE TRANSAÇÕES (EXTRATO) - COM A ONDA (DELAY 0.25s) */}
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-2 transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.25s' }}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl gap-1">
                  <button onClick={() => setAbaExtrato("extrato")} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${abaExtrato === "extrato" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Extrato</button>
                  <button onClick={() => setAbaExtrato("parcelamentos")} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${abaExtrato === "parcelamentos" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>📅 Parcelamentos</button>
                </div>
                <button onClick={() => toggleVisibilidadeBloco('extrato')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none">
                  {visibilidade.extrato ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  )}
                </button>
              </div>
              {abaExtrato === "parcelamentos" && (
                <input type="text" value={buscaParcelamento} onChange={(e) => setBuscaParcelamento(e.target.value)} placeholder="Buscar por descrição..." className="w-full sm:w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              )}
            </div>

            {isLoadingData ? (
              <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : abaExtrato === "parcelamentos" ? (
              gruposParcelamento.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
                  <p className="text-gray-500 dark:text-gray-400 font-bold">Nenhum parcelamento encontrado.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {gruposParcelamento.map((g: any) => {
                    const expandido = grupoExpandidoId === g.id;
                    return (
                      <li key={g.id}>
                        <button onClick={() => setGrupoExpandidoId(expandido ? null : g.id)} className="w-full p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors flex items-center justify-between gap-4 text-left">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <span className={`text-lg text-gray-400 dark:text-gray-500 transition-transform shrink-0 ${expandido ? "rotate-90" : ""}`}>›</span>
                            <div className="truncate">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{g.descricaoBase}</p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-[12px] font-bold text-gray-500 dark:text-gray-400 flex-wrap">
                                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">{g.categoriaNome}</span>
                                <span className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded-md">{g.contaNome}</span>
                                <span>{g.itens.length}/{g.totalParcelas} parcelas</span>
                                {g.itens.length < g.totalParcelas && <span className="text-orange-500 dark:text-orange-400">incompleto</span>}
                              </div>
                            </div>
                          </div>
                          <span className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 shrink-0">{formatarMoeda(g.valorTotal, visibilidade.extrato)}</span>
                        </button>
                        {expandido && (
                          <div className="px-4 sm:px-6 pb-4 space-y-1.5">
                            {g.itens.map((t: any) => (
                              <div key={t.id} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                                  <span className="text-gray-400 dark:text-gray-500 w-14">{t.descricao.match(/\((\d+\/\d+)\)$/)?.[1]}</span>
                                  <span>{formatarDataNormal(t.data)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-gray-900 dark:text-gray-100">{formatarMoeda(t.valor, visibilidade.extrato)}</span>
                                  <button onClick={() => abrirModalEditar(t)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar parcela">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                  </button>
                                  <button onClick={() => { setTransacaoAlvo(t); abrirModalDeExclusao(); }} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Excluir parcela">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : transacoesFiltradas.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
                <p className="text-gray-500 dark:text-gray-400 font-bold">Nenhum lançamento encontrado para estes filtros.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {transacoesFiltradas.map((t) => {
                  const isDinOrigem = t.conta_origem?.tipo === "dinheiro";
                  const nomeBancoOrigem = isDinOrigem ? "Dinheiro Físico" : t.conta_origem?.banco_vinculado?.banco || "Banco Origem";
                  const userOrigem = t.conta_origem?.autor_nome || t.autor_nome;
                  const veiculoOrigem = t.conta_origem?.nome || "Forma Pagto";
                  const fotoOrigem = mapPerfis[userOrigem];

                  const isDinDestino = t.conta_destino?.tipo === "dinheiro";
                  const isCreditoDestino = t.conta_destino?.tipo === "credito";
                  const nomeBancoDestino = isDinDestino ? "Dinheiro Físico" : isCreditoDestino ? "Fatura Cartão" : t.conta_destino?.banco_vinculado?.banco || "Banco Destino";
                  const userDestino = t.conta_destino?.autor_nome || t.autor_nome;
                  const fotoDestino = mapPerfis[userDestino];

                  return (
                    <li key={t.id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors flex items-center justify-between gap-4 group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`hidden sm:flex h-10 w-10 shrink-0 rounded-full items-center justify-center ${t.tipo === "receita" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : t.tipo === "despesa" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>
                          {t.tipo === "receita" ? "↓" : t.tipo === "despesa" ? "↑" : "🔄"}
                        </div>
                        
                        <div className="truncate">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{t.descricao}</p>

                          {t.tipo === "transferencia" ? (
                            <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-[12px] font-bold flex-wrap">
                              <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2 py-0.5 rounded-md flex items-center gap-1">🔄 Transf.</span>
                              <span className="text-gray-800 dark:text-gray-200 flex items-center gap-1">
                                {nomeBancoOrigem}
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[8px]">
                                  {fotoOrigem ? <img src={fotoOrigem} className="w-full h-full object-cover" alt="" /> : userOrigem.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-gray-400 dark:text-gray-500 mx-1">➔</span>
                                {nomeBancoDestino}
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[8px]">
                                  {fotoDestino ? <img src={fotoDestino} className="w-full h-full object-cover" alt="" /> : userDestino.charAt(0).toUpperCase()}
                                </div>
                              </span>
                              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                              <span className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">{veiculoOrigem}</span>
                              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                              <span className="text-gray-500 dark:text-gray-400">{formatarDataNormal(t.data)}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-[12px] font-bold text-gray-500 dark:text-gray-400 flex-wrap">
                              <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">{t.categorias?.nome || "Sem categoria"}</span>
                              <span className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded-md">{nomeBancoOrigem}</span>
                              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                              <span className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">{veiculoOrigem}</span>
                              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                              <span>{formatarDataNormal(t.data)}</span>
                              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[9px] border border-blue-200 dark:border-blue-800" title={`@${userOrigem}`}>
                                {fotoOrigem ? <img src={fotoOrigem} className="w-full h-full object-cover" alt="" /> : userOrigem.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-base sm:text-lg font-black ${t.tipo === "receita" ? "text-green-600 dark:text-green-400" : t.tipo === "despesa" ? "text-gray-900 dark:text-gray-100" : "text-blue-600 dark:text-blue-400"}`}>
                          {t.tipo === "receita" ? "+" : t.tipo === "despesa" ? "-" : ""} {formatarMoeda(t.valor, visibilidade.extrato)}
                        </span>
                        <button onClick={() => abrirModalEditar(t)} className={`p-2 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100 ${t.user_id === userId ? "text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" : "text-gray-200 dark:text-gray-700 cursor-not-allowed"}`} title="Editar Lançamento">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>

        <button onClick={abrirModalNovoLancamento} className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 z-20">+</button>

        {/* ======================================================= */}
        {/* MODAL DE LANÇAMENTO E EDIÇÃO                            */}
        {/* ======================================================= */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-visible animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 my-auto">
              
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 sticky top-0 z-[60] backdrop-blur-md rounded-t-2xl">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{editandoId ? "Editar Lançamento" : "Novo Lançamento"}</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold">&times;</button>
              </div>

              <form onSubmit={dispararAuditoriaAtualizacao} className="p-6 space-y-4">
                <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl relative z-0">
                  <button type="button" onClick={() => { setTipo("despesa"); closeAllDropdowns(); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "despesa" ? "bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Despesa</button>
                  <button type="button" onClick={() => { setTipo("receita"); closeAllDropdowns(); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "receita" ? "bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Receita</button>
                  <button type="button" onClick={() => { setTipo("transferencia"); closeAllDropdowns(); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${tipo === "transferencia" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>🔄 Transf.</button>
                </div>

                {tipo === "transferencia" && (
                  <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800">
                    <input type="checkbox" id="checkFatura" checked={isPagamentoFatura} onChange={(e) => { setIsPagamentoFatura(e.target.checked); setBancoDestinoId(""); setFaturaDestinoId(""); }} className="w-5 h-5 text-purple-600 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 cursor-pointer" />
                    <label htmlFor="checkFatura" className="text-sm font-bold text-purple-800 dark:text-purple-400 cursor-pointer select-none">💳 É pagamento de Fatura de Cartão?</label>
                  </div>
                )}

                <div className="flex gap-3 sm:gap-4 relative z-0">
                  <div className="flex-[2]">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">{parcelas > 1 ? "Valor Total (R$)" : "Valor (R$)"}</label>
                    <input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-lg font-black text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" />
                  </div>

                  {!editandoId && tipo !== "transferencia" && (
                    <div className="flex-1">
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Vezes</label>
                      <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-black text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 appearance-none text-center">
                        {Array.from({ length: 48 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
                      </select>
                    </div>
                  )}

                  <div className="flex-[2]">
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider truncate">{parcelas > 1 ? "1ª Parcela" : "Data"}</label>
                    <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-[11px] sm:text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" />
                  </div>
                </div>

                {!editandoId && tipo !== "transferencia" && parcelas > 1 && (() => {
                  const valorTotalPreview = parseFloat((valor || "0").replace(",", ".")) || 0;
                  const vBasePreview = Math.floor((valorTotalPreview / parcelas) * 100) / 100;
                  const diferencaPreview = Number((valorTotalPreview - vBasePreview * parcelas).toFixed(2));
                  const somaManual = valoresParcelasManual.reduce((acc, v) => acc + (parseFloat((v || "0").replace(",", ".")) || 0), 0);
                  const diferencaManual = Number((valorTotalPreview - somaManual).toFixed(2));
                  return (
                    <div className="space-y-2 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Diferença de arredondamento</label>
                      <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl gap-1">
                        <button type="button" onClick={() => setModoParcelamento("primeira")} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${modoParcelamento === "primeira" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Na 1ª parcela</button>
                        <button type="button" onClick={() => setModoParcelamento("ultima")} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${modoParcelamento === "ultima" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Na última</button>
                        <button type="button" onClick={() => setModoParcelamento("manual")} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${modoParcelamento === "manual" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Personalizar</button>
                      </div>

                      {modoParcelamento === "manual" ? (
                        <div className="space-y-2">
                          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {Array.from({ length: parcelas }, (_, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 w-12 shrink-0">{i + 1}/{parcelas}</span>
                                <input type="text" inputMode="decimal" value={valoresParcelasManual[i] ?? ""} onChange={(e) => atualizarValorParcelaManual(i, e.target.value)} placeholder="0,00" className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" />
                              </div>
                            ))}
                          </div>
                          <p className={`text-[11px] font-bold ${Math.abs(diferencaManual) > 0.01 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            Soma: R$ {somaManual.toFixed(2)} {diferencaManual > 0.01 ? `— faltam R$ ${diferencaManual.toFixed(2)} para bater com o total` : diferencaManual < -0.01 ? `— excede o total em R$ ${Math.abs(diferencaManual).toFixed(2)}` : "— confere com o valor total"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                          {parcelas}x de R$ {vBasePreview.toFixed(2)}, com a {modoParcelamento === "primeira" ? "1ª parcela" : "última parcela"} em R$ {(vBasePreview + diferencaPreview).toFixed(2)}.
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="relative z-0">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Descrição</label>
                  <input type="text" required value={descricao} onChange={(e) => { setDescricao(e.target.value); setDescricaoTocada(true); }} placeholder={tipo === "transferencia" ? (isPagamentoFatura ? "Ex: Pagamento Fatura Nubank..." : "Ex: Guardar Dinheiro...") : "Ex: Supermercado"} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" />
                </div>

                <div className="space-y-4">
                  {tipo !== "transferencia" && (
                    <div className="relative z-0">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Categoria</label>
                      <select required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20">
                        <option value="" disabled>Selecione...</option>
                        {categoriasFiltradasModal.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                      </select>
                    </div>
                  )}

                  {tipo === "despesa" && contasFixasSugestoes.length > 0 && (
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3 space-y-2 animate-in fade-in">
                      <span className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">📌 Vincular a uma conta fixa?</span>
                      <div className="flex flex-wrap gap-2">
                        {contasFixasSugestoes.filter((f) => f.ocorrencia?.status !== "pago" || f.ocorrencia?.id === vinculoContaFixa?.ocorrenciaId).map((f) => {
                          const selecionada = vinculoContaFixa?.contaFixaId === f.id;
                          const label = f.ocorrencia
                            ? (f.ocorrencia.status === "pago" ? `${f.nome} · vinculada R$ ${Number(f.ocorrencia.valor ?? 0).toFixed(2)}` : f.ocorrencia.valor != null ? `${f.nome} · pendente R$ ${Number(f.ocorrencia.valor).toFixed(2)}` : `${f.nome} · pendente (sem valor)`)
                            : `➕ ${f.nome} (nova pendência)`;
                          return (
                            <button key={f.id} type="button" onClick={() => {
                              setVinculoContaFixa({ contaFixaId: f.id, ocorrenciaId: f.ocorrencia?.id || null });
                              if (f.ocorrencia && !descricaoTocada) setDescricao(`${f.nome} Ref. ${String(f.ocorrencia.competencia_mes).padStart(2, "0")}/${f.ocorrencia.competencia_ano}`);
                            }} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${selecionada ? "bg-amber-600 border-amber-600 text-white" : "bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"}`}>
                              {label}
                            </button>
                          );
                        })}
                        {vinculoContaFixa && (
                          <button type="button" onClick={() => setVinculoContaFixa(null)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">Nenhum vínculo</button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CAMPO 1: BANCO ORIGEM */}
                  {(tipo === "receita" || tipo === "transferencia") && (
                    <div className={`relative ${isBancoOrigemOpen ? "z-50" : "z-30"}`}>
                      <label className={`block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1 ${tipo === "receita" ? "text-green-700 dark:text-green-400" : "text-purple-700 dark:text-purple-400"}`}>
                        🏦 {tipo === "receita" ? "Onde entrou o dinheiro?" : "De onde sai o dinheiro? (Banco)"}
                      </label>
                      <button type="button" onClick={() => { setIsBancoOrigemOpen(!isBancoOrigemOpen); setIsFormaPagtoOpen(false); setIsBancoDestinoOpen(false); setIsFaturaDestinoOpen(false); }} className={`flex items-center justify-between w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 focus:ring-4 transition-all h-[55px] ${tipo === "receita" ? "focus:border-green-500 focus:ring-green-500/20" : "focus:border-purple-500 focus:ring-purple-500/20"}`}>
                        {bancoOrigemId ? (
                          bancoOrigemId === "dinheiro" ? (
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">💵</div>
                              <div className="flex flex-col items-start truncate text-left">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">Dinheiro Físico</span>
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">Na Carteira / Cofre</span>
                              </div>
                            </div>
                          ) : (
                            () => {
                              const b = bancos.find((x) => x.id === bancoOrigemId);
                              if (!b) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione o banco...</span>;
                              const fotoBanco = mapPerfis[b.autor_nome];
                              return (
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 overflow-hidden">
                                    {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : b.autor_nome?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col items-start truncate text-left">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full flex items-center gap-1">
                                      {b.banco} <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">{b.nome}</span>
                                  </div>
                                </div>
                              );
                            }
                          )()
                        ) : (
                          <span className="text-gray-400 font-bold text-sm ml-1">Apenas o Banco...</span>
                        )}
                        <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isBancoOrigemOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </button>

                      {isBancoOrigemOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                          <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 dark:border-gray-700/50 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            🏦 Bancos e Cofres
                          </div>
                          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                            {bancos.filter((b) => b.ativo !== false && (!somenteMinhasContas || b.user_id === userId)).map((banco) => {
                              const temChave = contas.some((c) => c.conta_bancaria_id === banco.id && c.tipo === "corrente" && c.ativo !== false);
                              if (!temChave) return null;
                              const fotoBanco = mapPerfis[banco.autor_nome];
                              return (
                                <li key={banco.id}>
                                  <button type="button" onClick={() => { setBancoOrigemId(banco.id); setFormaPagtoId(""); setIsBancoOrigemOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 overflow-hidden">
                                      {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : banco.autor_nome?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col truncate">
                                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                                        {banco.banco} <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">@{banco.autor_nome}</span>
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">{banco.nome}</span>
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                            <li key="dinheiro_origem">
                              <button type="button" onClick={() => { setBancoOrigemId("dinheiro"); setFormaPagtoId(""); setIsBancoOrigemOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">💵</div>
                                <div className="flex flex-col truncate">
                                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Dinheiro Físico</span>
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">Cofre Principal</span>
                                </div>
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CAMPO 2: FORMA DE PAGTO */}
                  {(tipo === "despesa" || (tipo === "transferencia" && bancoOrigemId && bancoOrigemId !== "dinheiro")) && (
                    <div className={`relative animate-in fade-in slide-in-from-top-4 duration-200 ${isFormaPagtoOpen ? "z-50" : "z-20"}`}>
                      <label className={`block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1 ${tipo === "despesa" ? "text-red-700 dark:text-red-400" : "text-gray-500 dark:text-gray-400 mt-4"}`}>
                        {tipo === "despesa" ? "💳 Forma Pagto / Banco" : "↘️ Qual a forma do envio? (PIX, Deb)"}
                      </label>
                      <button type="button" onClick={() => { setIsFormaPagtoOpen(!isFormaPagtoOpen); setIsBancoOrigemOpen(false); setIsBancoDestinoOpen(false); setIsFaturaDestinoOpen(false); }} className={`flex items-center justify-between w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 focus:ring-4 transition-all h-[55px] ${tipo === "despesa" ? "focus:border-red-500 focus:ring-red-500/20" : "focus:border-gray-500 focus:ring-gray-500/20"}`}>
                        {formaPagtoId ? (() => {
                          const selected = contas.find((c) => c.id === formaPagtoId);
                          if (!selected) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione...</span>;
                          const avatar = getContaAvatar(selected);
                          return (
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                              </div>
                              <div className="flex flex-col items-start truncate text-left">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">{selected.nome}</span>
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">{getContaSubtitle(selected)}</span>
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-gray-400 font-bold text-sm ml-1">Selecione o meio de pagamento...</span>
                        )}
                        <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isFormaPagtoOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </button>

                      {isFormaPagtoOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                          {tipo === "despesa" ? (
                            bancos.filter((b) => b.ativo !== false && (!somenteMinhasContas || b.user_id === userId)).map((banco) => {
                              const chavesDoBanco = contas.filter((c) => c.conta_bancaria_id === banco.id && c.ativo !== false);
                              if (chavesDoBanco.length === 0) return null;
                              return (
                                <div key={banco.id}>
                                  <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 dark:border-gray-700/50 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 flex items-center justify-between">
                                    <span>🏦 {banco.banco}</span><span>@{banco.autor_nome}</span>
                                  </div>
                                  <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {chavesDoBanco.map((c) => {
                                      const avatar = getContaAvatar(c);
                                      return (
                                        <li key={c.id}>
                                          <button type="button" onClick={() => { setFormaPagtoId(c.id); setIsFormaPagtoOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                              {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                            </div>
                                            <div className="flex flex-col truncate">
                                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{c.nome}</span>
                                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">{getContaSubtitle(c)}</span>
                                            </div>
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })
                          ) : (
                            <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                              {contas.filter((c) => c.conta_bancaria_id === bancoOrigemId && c.tipo === "corrente" && c.ativo !== false).map((c) => {
                                const avatar = getContaAvatar(c);
                                return (
                                  <li key={c.id}>
                                    <button type="button" onClick={() => { setFormaPagtoId(c.id); setIsFormaPagtoOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                        {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                      </div>
                                      <div className="flex flex-col truncate">
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{c.nome}</span>
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">{getContaSubtitle(c)}</span>
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {tipo === "despesa" && (() => {
                            const chavesDin = contas.filter((c) => c.tipo === "dinheiro" && c.ativo !== false);
                            if (chavesDin.length === 0) return null;
                            return (
                              <div>
                                <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 dark:border-gray-700/50 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">💵 Dinheiro Físico</div>
                                <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                                  {chavesDin.map((c) => {
                                    const avatar = getContaAvatar(c);
                                    return (
                                      <li key={c.id}>
                                        <button type="button" onClick={() => { setFormaPagtoId(c.id); setIsFormaPagtoOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                            {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                          </div>
                                          <div className="flex flex-col truncate">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{c.nome}</span>
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">{getContaSubtitle(c)}</span>
                                          </div>
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CAMPO 3: DESTINO TRANSFERENCIA */}
                  {tipo === "transferencia" && (
                    <div className={`relative mt-4 animate-in fade-in slide-in-from-top-4 duration-200 ${isPagamentoFatura ? (isFaturaDestinoOpen ? "z-50" : "z-10") : isBancoDestinoOpen ? "z-50" : "z-10"}`}>
                      <div className="absolute -top-4 left-6 text-gray-300 dark:text-gray-600 z-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
                      </div>
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 uppercase tracking-wider flex items-center gap-1 pt-2 relative z-10">
                        📥 {isPagamentoFatura ? "Qual fatura você vai pagar?" : "Para qual Banco/Cofre vai?"}
                      </label>

                      {isPagamentoFatura ? (
                        <button type="button" onClick={() => { setIsFaturaDestinoOpen(!isFaturaDestinoOpen); setIsFormaPagtoOpen(false); setIsBancoOrigemOpen(false); }} className="flex items-center justify-between w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all h-[55px] relative z-10">
                          {faturaDestinoId ? (() => {
                            const c = contas.find((x) => x.id === faturaDestinoId);
                            if (!c) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione a fatura...</span>;
                            const avatar = getContaAvatar(c);
                            return (
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                  {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                </div>
                                <div className="flex flex-col items-start truncate text-left">
                                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">{c.nome}</span>
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">{getContaSubtitle(c)}</span>
                                </div>
                              </div>
                            );
                          })() : (
                            <span className="text-gray-400 font-bold text-sm ml-1">Selecione a fatura...</span>
                          )}
                          <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isFaturaDestinoOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </button>
                      ) : (
                        <button type="button" onClick={() => { setIsBancoDestinoOpen(!isBancoDestinoOpen); setIsFormaPagtoOpen(false); setIsBancoOrigemOpen(false); }} className="flex items-center justify-between w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all h-[55px] relative z-10">
                          {bancoDestinoId ? (() => {
                            if (bancoDestinoId === "dinheiro") {
                              return (
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">💵</div>
                                  <div className="flex flex-col items-start truncate text-left">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">Dinheiro Físico</span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">Na Carteira / Cofre</span>
                                  </div>
                                </div>
                              );
                            }
                            const b = bancos.find((x) => x.id === bancoDestinoId);
                            if (!b) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione o banco...</span>;
                            const fotoBanco = mapPerfis[b.autor_nome];
                            return (
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 overflow-hidden">
                                  {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : b.autor_nome?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col items-start truncate text-left">
                                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full flex items-center gap-1">
                                    {b.banco} <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">{b.nome}</span>
                                </div>
                              </div>
                            );
                          })() : (
                            <span className="text-gray-400 font-bold text-sm ml-1">Selecione o banco destino...</span>
                          )}
                          <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isBancoDestinoOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </button>
                      )}

                      {isPagamentoFatura && isFaturaDestinoOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                          <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 dark:border-gray-700/50 bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">💳 Faturas em Aberto</div>
                          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                            {contas.filter((c) => c.tipo === "credito" && c.ativo !== false && (!somenteMinhasContas || c.user_id === userId)).map((c) => {
                              const avatar = getContaAvatar(c);
                              const faturaAtual = obterFaturasDoCartao(c.id).totalGeral;
                              return (
                                <li key={c.id}>
                                  <button type="button" onClick={() => { setFaturaDestinoId(c.id); setIsFaturaDestinoOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                        {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                      </div>
                                      <div className="flex flex-col truncate">
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{c.nome}</span>
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">{getContaSubtitle(c)}</span>
                                      </div>
                                    </div>
                                    <span className={`text-xs font-black shrink-0 ${faturaAtual > 0 ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500"}`}>
                                      {formatarMoeda(faturaAtual)}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      
                      {/* UI INTELIGENTE PARA SELECIONAR E PREENCHER O VALOR DA FATURA */}
                      {isPagamentoFatura && faturaDestinoId && !isFaturaDestinoOpen && (
                        <div className="mt-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4 rounded-xl animate-in fade-in duration-300 relative z-0">
                          <p className="text-xs font-bold text-purple-800 dark:text-purple-400 mb-2">Clique na fatura que deseja pagar:</p>
                          <div className="space-y-2">
                            {obterFaturasDoCartao(faturaDestinoId).faturasAbertas.map(f => (
                               <div key={f.chave} onClick={() => setValor(f.valorAberto.toFixed(2))} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 transition-all shadow-sm active:scale-95">
                                  <div>
                                     <span className="block text-xs font-bold text-gray-900 dark:text-white">Venc. {f.labelVencimento}</span>
                                     <span className={`text-[10px] font-black uppercase tracking-wider ${f.status === 'Atrasada' ? 'text-red-600 dark:text-red-400' : f.status === 'Fechada' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{f.status}</span>
                                  </div>
                                  <span className="text-sm font-black text-purple-700 dark:text-purple-400">{formatarMoeda(f.valorAberto)}</span>
                               </div>
                            ))}
                            {obterFaturasDoCartao(faturaDestinoId).faturasAbertas.length === 0 && <p className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center py-2">Nenhuma fatura pendente.</p>}
                          </div>
                        </div>
                      )}

                      {!isPagamentoFatura && isBancoDestinoOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                          <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 dark:border-gray-700/50 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">🏦 Bancos e Cofres Disponíveis</div>
                          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                            {bancos.filter((b) => b.ativo !== false && b.id !== bancoOrigemId && (!somenteMinhasContas || b.user_id === userId)).map((banco) => {
                              const temChave = contas.some((c) => c.conta_bancaria_id === banco.id && c.tipo === "corrente" && c.ativo !== false);
                              if (!temChave) return null;
                              const fotoBanco = mapPerfis[banco.autor_nome];
                              return (
                                <li key={banco.id}>
                                  <button type="button" onClick={() => { setBancoDestinoId(banco.id); setIsBancoDestinoOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 overflow-hidden">
                                      {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : banco.autor_nome?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col truncate">
                                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                                        {banco.banco} <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">@{banco.autor_nome}</span>
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">{banco.nome}</span>
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                            {bancoOrigemId !== "dinheiro" && (
                              <li key="dinheiro_destino">
                                <button type="button" onClick={() => { setBancoDestinoId("dinheiro"); setIsBancoDestinoOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">💵</div>
                                  <div className="flex flex-col truncate">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Dinheiro Físico</span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">Cofre Principal</span>
                                  </div>
                                </button>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <input type="checkbox" id="filtroContas" checked={somenteMinhasContas} onChange={(e) => setSomenteMinhasContas(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer" />
                    <label htmlFor="filtroContas" className="text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none">Visualizar apenas minhas contas</label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 relative z-0">
                  {editandoId && (
                    <button type="button" onClick={abrirModalDeExclusao} className="px-4 py-3.5 rounded-xl font-bold transition-all active:scale-95 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 shrink-0" title="Excluir Lançamento">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    </button>
                  )}
                  <button type="submit" disabled={isProcessingAudit} className={`flex-1 py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 ${tipo === "receita" ? "bg-green-600 hover:bg-green-700" : tipo === "transferencia" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`}>
                    {isProcessingAudit ? "Processando..." : editandoId ? "Atualizar" : `Salvar ${tipo === "receita" ? "Receita" : tipo === "transferencia" ? "Transf." : "Despesa"}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* MODAL DE AUDITORIA DE ATUALIZAÇÃO                       */}
        {/* ======================================================= */}
        {isUpdateModalOpen && transacaoAlvo && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsUpdateModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-blue-100 dark:border-blue-900/50">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/20 flex justify-between items-center">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">Auditoria de Edição</h3>
                <button onClick={() => setIsUpdateModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl">&times;</button>
              </div>
              <form onSubmit={executarSalvarTransacaoBD} className="p-6 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Você está alterando o lançamento:</p>
                  <p className="text-lg font-black text-gray-900 dark:text-gray-100 mt-1 truncate">{transacaoAlvo.descricao}</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Por que você está alterando os dados?</label>
                  <textarea required rows={2} value={motivoAuditoria} onChange={(e) => setMotivoAuditoria(e.target.value)} placeholder="Ex: Digitei o valor errado, troquei de conta..." className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 resize-none" />
                </div>
                {motivosFrequentes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-full mb-1">Motivos recentes:</span>
                    {motivosFrequentes.map((motivo, idx) => (
                      <button key={idx} type="button" onClick={() => setMotivoAuditoria(motivo)} className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-800 dark:text-blue-300 py-1.5 px-3 rounded-full transition-colors">{motivo}</button>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Digite <span className="text-blue-600 dark:text-blue-400 font-black uppercase">ATUALIZAR</span> para confirmar</label>
                  <input type="text" required value={palavraConfirmacao} onChange={(e) => setPalavraConfirmacao(e.target.value)} placeholder="atualizar" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-black text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-center tracking-widest uppercase" />
                </div>
                <button type="submit" disabled={isProcessingAudit || palavraConfirmacao.toLowerCase() !== "atualizar" || motivoAuditoria.trim() === ""} className="w-full py-3.5 rounded-xl text-white font-black transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isProcessingAudit ? "Gravando Log..." : "Confirmar Atualização"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                        */}
        {/* ======================================================= */}
        {isDeleteModalOpen && transacaoAlvo && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100 dark:border-red-900/50">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-red-50/50 dark:bg-red-900/20 flex justify-between items-center">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">Apagar Lançamento</h3>
                <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl">&times;</button>
              </div>
              <form onSubmit={confirmarExclusaoComAuditoria} className="p-6 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Você está prestes a excluir:</p>
                  <p className="text-lg font-black text-gray-900 dark:text-gray-100 mt-1 truncate">{transacaoAlvo.descricao}</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Motivo da Exclusão</label>
                  <textarea required rows={2} value={motivoAuditoria} onChange={(e) => setMotivoAuditoria(e.target.value)} placeholder="Por que está apagando isso?" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 resize-none" />
                </div>
                {motivosFrequentes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-full mb-1">Motivos recentes:</span>
                    {motivosFrequentes.map((motivo, idx) => (
                      <button key={idx} type="button" onClick={() => setMotivoAuditoria(motivo)} className="text-xs font-bold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-1.5 px-3 rounded-full transition-colors">{motivo}</button>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Digite <span className="text-red-600 dark:text-red-400 font-black uppercase">EXCLUIR</span> para confirmar</label>
                  <input type="text" required value={palavraConfirmacao} onChange={(e) => setPalavraConfirmacao(e.target.value)} placeholder="excluir" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-black text-gray-900 dark:text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-center tracking-widest uppercase" />
                </div>
                <button type="submit" disabled={isProcessingAudit || palavraConfirmacao.toLowerCase() !== "excluir" || motivoAuditoria.trim() === ""} className="w-full py-3.5 rounded-xl text-white font-black transition-all active:scale-95 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isProcessingAudit ? "Apagando..." : "Confirmar Exclusão"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}