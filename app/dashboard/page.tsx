"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

export default function DashboardPage() {
  const router = useRouter();

  // ==========================================
  // ESTADOS GERAIS DO USUÁRIO
  // ==========================================
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ==========================================
  // ESTADOS DE DADOS
  // ==========================================
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // ==========================================
  // ESTADOS DO FORMULÁRIO DE LANÇAMENTO
  // ==========================================
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
  const [isPagamentoFatura, setIsPagamentoFatura] = useState(false);

  // IDs selecionados no form
  const [formaPagtoId, setFormaPagtoId] = useState("");
  const [bancoOrigemId, setBancoOrigemId] = useState("");
  const [bancoDestinoId, setBancoDestinoId] = useState("");
  const [faturaDestinoId, setFaturaDestinoId] = useState("");

  // Controles de visualização de Dropdowns
  const [isFormaPagtoOpen, setIsFormaPagtoOpen] = useState(false);
  const [isBancoOrigemOpen, setIsBancoOrigemOpen] = useState(false);
  const [isBancoDestinoOpen, setIsBancoDestinoOpen] = useState(false);
  const [isFaturaDestinoOpen, setIsFaturaDestinoOpen] = useState(false);

  // ==========================================
  // ESTADOS DOS FILTROS DO DASHBOARD
  // ==========================================
  const hojeData = new Date();
  const [dataInicio, setDataInicio] = useState(getDatLocal(new Date(hojeData.getFullYear(), hojeData.getMonth(), 1)));
  const [dataFim, setDataFim] = useState(getDatLocal(hojeData));
  const [atalhoAtivo, setAtalhoAtivo] = useState("m");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [textoInputData, setTextoInputData] = useState("");

  const [filtroTipo, setFiltroTipo] = useState<string[]>(["receita", "despesa", "transferencia"]);
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [somenteMinhasContas, setSomenteMinhasContas] = useState(true);

  // ==========================================
  // ESTADOS DE AUDITORIA (EXCLUSÃO E ATUALIZAÇÃO)
  // ==========================================
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [transacaoAlvo, setTransacaoAlvo] = useState<any>(null);
  const [motivoAuditoria, setMotivoAuditoria] = useState("");
  const [palavraConfirmacao, setPalavraConfirmacao] = useState("");
  const [isProcessingAudit, setIsProcessingAudit] = useState(false);
  const [motivosFrequentes, setMotivosFrequentes] = useState<string[]>([]);

  // ==========================================
  // FUNÇÕES UTILITÁRIAS
  // ==========================================
  const showToast = (msg: string, t: "success" | "error" = "success") => {
    setToast({ show: true, message: msg, type: t });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const formatarMoeda = (v: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  };

  const formatarDataNormal = (dStr: string) => {
    const [a, m, d] = dStr.split("-");
    return `${d}/${m}/${a}`;
  };

  const closeAllDropdowns = () => {
    setIsFormaPagtoOpen(false);
    setIsBancoOrigemOpen(false);
    setIsBancoDestinoOpen(false);
    setIsFaturaDestinoOpen(false);
  };

  const nomesAtalhos: Record<string, string> = {
    h: "Hoje", o: "Ontem", s: "Acumulado da Semana", sa: "Semana Anterior",
    m: "Acumulado do Mês", ma: "Mês Anterior", a: "Acumulado do Ano", aa: "Ano Anterior"
  };

  // ==========================================
  // CARREGAMENTO DE DADOS (INICIAL)
  // ==========================================
  const carregarDados = async (isInitialLoad = false) => {
    setIsLoadingData(true);

    // Carrega fotos dos perfis
    const { data: perfisData } = await supabase.from("profiles").select("username, avatar_url");
    if (perfisData) {
      const mapa: Record<string, string> = {};
      perfisData.forEach((p) => {
        if (p.username && p.avatar_url) mapa[p.username] = p.avatar_url;
      });
      setMapPerfis(mapa);
    }

    // Carrega Histórico
    const { data: historico, error } = await supabase
      .from("transacoes")
      .select(`
        *, 
        categorias(nome), 
        conta_origem:contas!conta_id(nome, tipo, autor_nome, banco_vinculado:contas_bancarias(nome, banco, autor_nome)), 
        conta_destino:contas!conta_destino_id(nome, tipo, autor_nome, banco_vinculado:contas_bancarias(nome, banco, autor_nome))
      `)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro:", error);
      showToast("Erro ao carregar dados.", "error");
    }

    const { data: contasData } = await supabase.from("contas").select("autor_nome");
    const { data: bancosData } = await supabase.from("contas_bancarias").select("*").order("nome", { ascending: true });

    if (bancosData) setBancos(bancosData);

    if (historico) {
      setTransacoes(historico);

      // Extrai os usuários únicos para o filtro
      const autoresTransacoes = historico.map((t) => t.autor_nome || "Usuário");
      const autoresContas = contasData ? contasData.map((c) => c.autor_nome || "Usuário") : [];
      const euMesmo = username || "Usuário";
      const unicos = Array.from(new Set([...autoresTransacoes, ...autoresContas, euMesmo].filter((n) => n && n !== "Família")));

      setUsuariosDisponiveis(unicos);
      if (isInitialLoad) {
        setUsuariosSelecionados(unicos);
      }
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário");
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");

        const { data: catData } = await supabase.from("categorias").select("*").order("nome");
        if (catData) setCategorias(catData);

        const { data: contasData } = await supabase.from("contas").select("*, banco_vinculado:contas_bancarias(nome, banco, autor_nome)").order("nome");
        if (contasData) setContas(contasData);

        carregarDados(true);
      } else {
        router.push("/login");
      }
    };
    loadInit();
  }, [router]);

  // ==========================================
  // LÓGICA DE FILTROS E ATALHOS DE DATA
  // ==========================================
  const aplicarAtalho = (atalho: string) => {
    const d = new Date();
    let inicio = new Date();
    let fim = new Date();
    let reconhecido = true;

    switch (atalho.toLowerCase().trim()) {
      case "h": break;
      case "o":
        inicio.setDate(d.getDate() - 1);
        fim.setDate(d.getDate() - 1);
        break;
      case "s":
        inicio.setDate(d.getDate() - d.getDay());
        break;
      case "sa":
        const diaSemanaAnt = d.getDay();
        inicio.setDate(d.getDate() - diaSemanaAnt - 7);
        fim.setDate(d.getDate() + (6 - diaSemanaAnt) - 7);
        break;
      case "m":
        inicio = new Date(d.getFullYear(), d.getMonth(), 1);
        break;
      case "ma":
        inicio = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        fim = new Date(d.getFullYear(), d.getMonth(), 0);
        break;
      case "a":
        inicio = new Date(d.getFullYear(), 0, 1);
        break;
      case "aa":
        inicio = new Date(d.getFullYear() - 1, 0, 1);
        fim = new Date(d.getFullYear() - 1, 11, 31);
        break;
      default:
        reconhecido = false;
        break;
    }

    if (reconhecido) {
      setDataInicio(getDatLocal(inicio));
      setDataFim(getDatLocal(fim));
      setAtalhoAtivo(atalho.toLowerCase().trim());
    } else {
      setAtalhoAtivo("");
    }
  };

  const handleInputDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextoInputData(val);
    aplicarAtalho(val);
  };

  const getDisplayPeriodo = () => {
    if (isDatePickerOpen) return textoInputData;
    if (atalhoAtivo && nomesAtalhos[atalhoAtivo]) {
      return `${nomesAtalhos[atalhoAtivo]} (${formatarDataNormal(dataInicio)} a ${formatarDataNormal(dataFim)})`;
    }
    return `De ${formatarDataNormal(dataInicio)} a ${formatarDataNormal(dataFim)}`;
  };

  const toggleTipo = (t: string) => {
    setFiltroTipo((prev) => (prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]));
  };

  const toggleUsuario = (nome: string) => {
    setUsuariosSelecionados((prev) => (prev.includes(nome) ? prev.filter((u) => u !== nome) : [...prev, nome]));
  };

  // ==========================================
  // FILTRAGEM DE TRANSAÇÕES
  // ==========================================
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  const transacoesFiltradas = transacoes.filter((t) => {
    const dataOk = t.data >= dataInicio && t.data <= dataFim;
    const tipoOk = filtroTipo.includes(t.tipo);
    const usuarioOk = t.autor_nome === "Família" || usuariosSelecionados.includes(t.autor_nome || "Usuário");
    return dataOk && tipoOk && usuarioOk;
  });

  const resumoFiltrado = transacoesFiltradas.reduce(
    (acc, t) => {
      const val = Number(t.valor);
      if (t.tipo === "receita") {
        acc.receitas += val;
        acc.saldo += val;
      } else if (t.tipo === "despesa") {
        if (t.conta_origem?.tipo === "credito") {
          acc.cartao += val;
        } else {
          acc.despesasPagas += val;
          acc.saldo -= val;
        }
      } else if (t.tipo === "transferencia") {
        if (t.conta_origem?.tipo !== "credito") {
          acc.saldo -= val;
        }
        if (t.conta_destino?.tipo === "credito") {
          acc.cartao -= val;
        } else if (t.conta_destino) {
          acc.saldo += val;
        }
      }
      return acc;
    },
    { saldo: 0, receitas: 0, despesasPagas: 0, cartao: 0 }
  );

  // ==========================================
  // CÁLCULOS DE SALDOS BANCÁRIOS E FATURAS
  // ==========================================
  const calcularFaturaAtual = (cartaoId: string) => {
    const gastos = transacoesFiltradas
      .filter((t) => t.conta_id === cartaoId && t.tipo === "despesa")
      .reduce((sum, t) => sum + Number(t.valor), 0);
    const pagamentos = transacoesFiltradas
      .filter((t) => t.conta_destino_id === cartaoId && t.tipo === "transferencia")
      .reduce((sum, t) => sum + Number(t.valor), 0);
    return gastos - pagamentos;
  };

  const cartoesCredito = contas.filter((c) => c.tipo === "credito");

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

  const getContaAvatar = (c: any) => {
    const foto = mapPerfis[c.autor_nome];
    if (c.tipo === "dinheiro") {
      return { photo: null, char: "💵", bg: "bg-emerald-100 text-emerald-600" };
    }
    if (c.tipo === "credito") {
      return { photo: foto, char: c.autor_nome?.charAt(0).toUpperCase() || "C", bg: "bg-purple-100 text-purple-700" };
    }
    return { photo: foto, char: c.autor_nome?.charAt(0).toUpperCase() || "B", bg: "bg-blue-100 text-blue-700" };
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

  // ==========================================
  // CONTROLE DO MODAL DE LANÇAMENTO E EDIÇÃO
  // ==========================================
  const resetFields = () => {
    setEditandoId(null);
    setValor("");
    setData(getDatLocal(new Date()));
    setDescricao("");
    setCategoriaId("");
    setParcelas(1);
    setIsPagamentoFatura(false);
    setFormaPagtoId("");
    setBancoOrigemId("");
    setBancoDestinoId("");
    setFaturaDestinoId("");
    closeAllDropdowns();
  };

  const abrirModalNovoLancamento = () => {
    resetFields();
    setTipo("despesa");
    setIsModalOpen(true);
  };

  const abrirModalEditar = (t: any) => {
    if (t.user_id !== userId) {
      showToast("Apenas o autor pode editar este lançamento.", "error");
      return;
    }
    resetFields();
    
    setEditandoId(t.id);
    setTipo(t.tipo);
    setValor(t.valor.toString());
    setData(t.data);
    setDescricao(t.descricao);
    setCategoriaId(t.categoria_id || "");

    if (t.tipo === "despesa") {
      setFormaPagtoId(t.conta_id || "");
    } else if (t.tipo === "receita") {
      const c = contas.find((x) => x.id === t.conta_id);
      setBancoOrigemId(c?.tipo === "dinheiro" ? "dinheiro" : c?.conta_bancaria_id || "");
    } else if (t.tipo === "transferencia") {
      const cOrigem = contas.find((x) => x.id === t.conta_id);
      setBancoOrigemId(cOrigem?.tipo === "dinheiro" ? "dinheiro" : cOrigem?.conta_bancaria_id || "");
      setFormaPagtoId(t.conta_id || "");

      const cDest = contas.find((x) => x.id === t.conta_destino_id);
      if (cDest?.tipo === "credito") {
        setIsPagamentoFatura(true);
        setFaturaDestinoId(cDest.id);
      } else {
        setIsPagamentoFatura(false);
        setBancoDestinoId(cDest?.tipo === "dinheiro" ? "dinheiro" : cDest?.conta_bancaria_id || "");
      }
    }
    
    setTransacaoAlvo(t);
    setIsModalOpen(true);
  };

  // ==========================================
  // FUNÇÕES DE SALVAMENTO (COM AUDITORIA OBRIGATÓRIA NA EDIÇÃO)
  // ==========================================
  const dispararAuditoriaAtualizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tipo === "despesa" && !formaPagtoId) { showToast("Selecione a forma de pagamento!", "error"); return; }
    if (tipo === "receita" && !bancoOrigemId) { showToast("Selecione onde recebeu!", "error"); return; }
    if (tipo === "transferencia") {
      if (!bancoOrigemId || !formaPagtoId) { showToast("Preencha a origem completa!", "error"); return; }
      if (isPagamentoFatura && !faturaDestinoId) { showToast("Selecione a fatura!", "error"); return; }
      if (!isPagamentoFatura && !bancoDestinoId) { showToast("Selecione o banco de destino!", "error"); return; }
      if (!isPagamentoFatura && bancoOrigemId === bancoDestinoId) { showToast("Origem e destino devem ser diferentes!", "error"); return; }
    }

    if (editandoId) {
      setMotivoAuditoria("");
      setPalavraConfirmacao("");
      setIsModalOpen(false);
      setIsUpdateModalOpen(true);

      // BUSCA MOTIVOS FREQUENTES DE ATUALIZAÇÃO
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      const { data: atualizadas } = await supabase
        .from("transacoes_atualizadas")
        .select("motivo")
        .eq("user_id", userId)
        .gte("atualizado_em", trintaDiasAtras.toISOString());

      if (atualizadas && atualizadas.length > 0) {
        const contagem: Record<string, number> = {};
        atualizadas.forEach((t) => {
          contagem[t.motivo] = (contagem[t.motivo] || 0) + 1;
        });
        const top3 = Object.entries(contagem)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((item) => item[0]);
        setMotivosFrequentes(top3);
      } else {
        setMotivosFrequentes([]);
      }
    } else {
      executarSalvarTransacaoBD();
    }
  };

  const executarSalvarTransacaoBD = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessingAudit(true);

    const valorNumerico = parseFloat(valor.replace(",", "."));

    let dbContaId = null;
    let dbContaDestinoId = null;

    if (tipo === "despesa") {
      dbContaId = formaPagtoId;
    }
    if (tipo === "receita") {
      dbContaId = getChavePrincipalDoBanco(bancoOrigemId);
    }
    if (tipo === "transferencia") {
      dbContaId = formaPagtoId;
      dbContaDestinoId = isPagamentoFatura ? faturaDestinoId : getChavePrincipalDoBanco(bancoDestinoId);
    }

    if (!dbContaId) {
      showToast("Erro: Nenhuma forma de pagamento vinculada ao banco origem.", "error");
      setIsProcessingAudit(false);
      return;
    }
    if (tipo === "transferencia" && !dbContaDestinoId) {
      showToast("Erro: Nenhuma conta vinculada ao banco destino.", "error");
      setIsProcessingAudit(false);
      return;
    }

    const payloadBase = {
      user_id: userId,
      autor_nome: username || "Usuário",
      tipo,
      categoria_id: tipo === "transferencia" ? null : categoriaId,
      conta_id: dbContaId,
      conta_destino_id: dbContaDestinoId,
    };

    if (editandoId) {
      // Cria registro de auditoria primeiro
      await supabase.from("transacoes_atualizadas").insert([
        {
          transacao_id: editandoId,
          descricao: transacaoAlvo.descricao,
          valor: transacaoAlvo.valor,
          data: transacaoAlvo.data,
          tipo: transacaoAlvo.tipo,
          categoria_id: transacaoAlvo.categoria_id,
          conta_id: transacaoAlvo.conta_id,
          conta_destino_id: transacaoAlvo.conta_destino_id,
          user_id: transacaoAlvo.user_id,
          autor_nome: transacaoAlvo.autor_nome,
          atualizado_por_nome: username || "Usuário",
          motivo: motivoAuditoria,
        },
      ]);
      // Depois atualiza o dado original
      const { error } = await supabase.from("transacoes").update({ ...payloadBase, descricao, valor: valorNumerico, data }).eq("id", editandoId);
      if (error) {
        showToast("Erro: " + error.message, "error");
      } else {
        showToast("Atualizado com sucesso!");
      }
    } else {
      if (tipo !== "transferencia" && parcelas > 1) {
        const payloadsMultiplos = [];
        const vBase = Math.floor((valorNumerico / parcelas) * 100) / 100;
        const vUltima = Number((valorNumerico - vBase * (parcelas - 1)).toFixed(2));
        
        for (let i = 0; i < parcelas; i++) {
          const [a, m, d] = data.split("-").map(Number);
          const dP = new Date(a, m - 1 + i, d);
          if (dP.getMonth() !== (m - 1 + i) % 12) dP.setDate(0);
          
          payloadsMultiplos.push({
            ...payloadBase,
            descricao: `${descricao} (${i + 1}/${parcelas})`,
            valor: i === parcelas - 1 ? vUltima : vBase,
            data: `${dP.getFullYear()}-${String(dP.getMonth() + 1).padStart(2, "0")}-${String(dP.getDate()).padStart(2, "0")}`,
          });
        }
        await supabase.from("transacoes").insert(payloadsMultiplos);
        showToast(`${parcelas} parcelas salvas!`);
      } else {
        await supabase.from("transacoes").insert([{ ...payloadBase, descricao, valor: valorNumerico, data }]);
        showToast("Lançamento salvo!");
      }
    }
    
    setIsProcessingAudit(false);
    setIsUpdateModalOpen(false);
    setIsModalOpen(false);
    carregarDados(false);
  };

  // ==========================================
  // FUNÇÕES DE EXCLUSÃO
  // ==========================================
  const abrirModalDeExclusao = async () => {
    setMotivoAuditoria("");
    setPalavraConfirmacao("");
    setIsModalOpen(false);
    setIsDeleteModalOpen(true);

    // BUSCA MOTIVOS FREQUENTES DE EXCLUSÃO
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const { data: excluidas } = await supabase
      .from("transacoes_excluidas")
      .select("motivo")
      .eq("user_id", userId)
      .gte("excluido_em", trintaDiasAtras.toISOString());

    if (excluidas && excluidas.length > 0) {
      const contagem: Record<string, number> = {};
      excluidas.forEach((t) => {
        contagem[t.motivo] = (contagem[t.motivo] || 0) + 1;
      });
      const top3 = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map((item) => item[0]);
      setMotivosFrequentes(top3);
    } else {
      setMotivosFrequentes([]);
    }
  };

  const confirmarExclusaoComAuditoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (palavraConfirmacao.toLowerCase() !== "excluir") return;
    
    setIsProcessingAudit(true);
    
    await supabase.from("transacoes_excluidas").insert([
      {
        transacao_id: transacaoAlvo.id,
        descricao: transacaoAlvo.descricao,
        valor: transacaoAlvo.valor,
        data: transacaoAlvo.data,
        tipo: transacaoAlvo.tipo,
        categoria_id: transacaoAlvo.categoria_id,
        conta_id: transacaoAlvo.conta_id,
        conta_destino_id: transacaoAlvo.conta_destino_id,
        user_id: transacaoAlvo.user_id,
        autor_nome: transacaoAlvo.autor_nome,
        excluido_por_nome: username || "Usuário",
        motivo: motivoAuditoria,
      },
    ]);
    
    await supabase.from("transacoes").delete().eq("id", transacaoAlvo.id);
    
    setIsProcessingAudit(false);
    showToast("Excluído com sucesso!");
    setIsDeleteModalOpen(false);
    carregarDados(false);
  };

  // ==========================================
  // VARIÁVEIS DO JSX
  // ==========================================
  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-gray-50 relative pb-20 overflow-x-hidden">
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl font-bold text-white flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          <span className="text-xl">{toast.type === "success" ? "✓" : "!"}</span>
          {toast.message}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center relative z-10">
        <h1 className="text-xl font-black text-blue-600 tracking-tight">Controle Financeiro</h1>
        <div className="flex items-center">
          <div className="flex flex-col items-end mr-4">
            <span className="text-base font-bold text-gray-900 leading-tight">@{username || "usuario"}</span>
            {fullName && <span className="text-sm font-medium text-gray-500 leading-tight mt-0.5">{fullName}</span>}
          </div>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-lg font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 overflow-hidden border-2 border-white"
            >
              {avatarUrl ? <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" /> : initialLetterMenu}
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-2 space-y-1">
                    <button onClick={() => router.push("/perfil")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Meu perfil</button>
                    <button onClick={() => router.push("/categorias")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Categorias</button>
                    <button onClick={() => router.push("/contas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Gestão bancária</button>
                    <button onClick={() => router.push("/insights")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Insights</button>
                    <button onClick={() => router.push("/auditoria")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Auditoria lançamentos</button>
                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        router.push("/login");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Sair do Sistema
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto space-y-6 mt-4 relative z-0">
        <div className="flex justify-between items-end">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Visão Geral</h2>
          <button
            onClick={abrirModalNovoLancamento}
            className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95"
          >
            <span className="text-xl leading-none">+</span> Novo Lançamento
          </button>
        </div>

        {/* CARDS RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Saldo Líquido <span className="lowercase text-gray-400 font-medium">(do período)</span>
            </h3>
            <p className={`text-3xl font-black mt-2 truncate ${resumoFiltrado.saldo >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatarMoeda(resumoFiltrado.saldo)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Receitas <span className="lowercase text-gray-400 font-medium">(do período)</span>
            </h3>
            <p className="text-3xl font-black text-green-500 mt-2 truncate">{formatarMoeda(resumoFiltrado.receitas)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Despesas Pagas <span className="lowercase text-gray-400 font-medium">(do período)</span>
            </h3>
            <p className="text-3xl font-black text-red-500 mt-2 truncate">{formatarMoeda(resumoFiltrado.despesasPagas)}</p>
          </div>
        </div>

        {/* GAVETA DE SALDOS BANCÁRIOS */}
        {!isLoadingData && (
          <div className="pt-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-4 ml-1">
              <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Meus Bancos & Cofres</h3>
              <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-200 px-2 py-0.5 rounded-full">Saldo Real</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">💵</div>
                  <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider truncate">Carteira / Casa</span>
                </div>
                <p className="text-lg font-black text-emerald-700 truncate">{formatarMoeda(saldoDinheiroFisico)}</p>
              </div>
              
              {saldosBancarios.map((banco) => {
                if (banco.ativo === false || !usuariosSelecionados.includes(banco.autor_nome)) return null;
                const fotoBanco = mapPerfis[banco.autor_nome];
                return (
                  <div key={banco.id} className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden">
                          {fotoBanco ? <img src={fotoBanco} alt="" className="w-full h-full object-cover" /> : banco.autor_nome?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-black text-blue-900 uppercase tracking-wider truncate block">{banco.banco}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-blue-600/70 uppercase tracking-wider mb-2 truncate block w-full">{banco.nome}</span>
                    <p className={`text-lg font-black truncate ${banco.saldo < 0 ? "text-red-600" : "text-blue-700"}`}>
                      {formatarMoeda(banco.saldo)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ÁREA DE CARTÕES DE CRÉDITO */}
        <div className="bg-purple-50/40 p-6 sm:p-8 rounded-2xl shadow-sm border border-purple-100 flex flex-col w-full mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-purple-100/50 pb-6">
            <div>
              <h3 className="text-sm text-purple-800 font-black uppercase tracking-wider flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> 
                Faturas (Cartão de Crédito)
              </h3>
              <p className="text-xs text-purple-600/70 font-bold mt-1">Acumulado do período filtrado</p>
            </div>
            <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-purple-100 w-full sm:w-auto text-center sm:text-right">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Total das Faturas</span>
              <span className="text-2xl font-black text-purple-700">{formatarMoeda(resumoFiltrado.cartao)}</span>
            </div>
          </div>
          
          {cartoesCredito.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cartoesCredito.map((cartao) => {
                const faturaAtual = calcularFaturaAtual(cartao.id);
                if ((!usuariosSelecionados.includes(cartao.autor_nome) && faturaAtual === 0) || (cartao.ativo === false && faturaAtual === 0)) return null;
                const fotoCartao = mapPerfis[cartao.autor_nome];
                return (
                  <div key={cartao.id} className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm flex flex-col justify-between hover:border-purple-300 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black shrink-0 overflow-hidden">
                          {fotoCartao ? <img src={fotoCartao} alt="" className="w-full h-full object-cover" /> : cartao.autor_nome?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-bold text-gray-900 truncate">{cartao.nome}</span>
                          {cartao.banco_vinculado && <span className="text-[9px] font-bold text-purple-400 uppercase truncate">🏦 {cartao.banco_vinculado.banco}</span>}
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Final {cartao.ultimos_digitos || "----"}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-purple-700">{formatarMoeda(faturaAtual)}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Vence dia {cartao.dia_vencimento}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/60 p-6 rounded-xl border border-purple-100 border-dashed flex flex-col items-center justify-center text-center py-10">
              <span className="text-3xl mb-2 opacity-50">💳</span>
              <p className="text-sm font-bold text-purple-500">Nenhum cartão de crédito ativo neste período.</p>
            </div>
          )}
        </div>

        {/* FILTROS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-5 mt-8 items-start lg:items-center">
          
          <div className="relative w-full lg:w-1/3 shrink-0">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Período (Digite o Atalho)</label>
            <input
              type="text"
              value={getDisplayPeriodo()}
              onFocus={() => { setIsDatePickerOpen(true); setTextoInputData(atalhoAtivo); }}
              onChange={handleInputDataChange}
              placeholder="Ex: m, h, sa..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
            />
            {isDatePickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setIsDatePickerOpen(false); setTextoInputData(""); }}></div>
                <div className="absolute top-[100%] mt-2 left-0 w-full sm:w-[450px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Atalhos Rápidos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                    {Object.entries(nomesAtalhos).map(([key, name]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { aplicarAtalho(key); setIsDatePickerOpen(false); setTextoInputData(""); }}
                        className={`text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${atalhoAtivo === key ? "bg-blue-600 text-white shadow-md scale-105" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${atalhoAtivo === key ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}`}>{key}</span>
                        <span className="text-center">{name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-gray-100 mb-4"></div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Ou Selecione no Calendário</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Inicial</label>
                      <input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setAtalhoAtivo(""); }} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Final</label>
                      <input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setAtalhoAtivo(""); }} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="hidden lg:block w-px h-12 bg-gray-200 shrink-0"></div>
          <div className="block lg:hidden w-full h-px bg-gray-100 my-1"></div>
          
          <div className="w-full lg:w-1/4 shrink-0">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tipo</label>
            <div className="flex gap-2">
              <button onClick={() => toggleTipo("receita")} className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 border ${filtroTipo.includes("receita") ? "bg-green-600 text-white border-green-600 shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>Receitas</button>
              <button onClick={() => toggleTipo("despesa")} className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 border ${filtroTipo.includes("despesa") ? "bg-red-600 text-white border-red-600 shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>Despesas</button>
              <button onClick={() => toggleTipo("transferencia")} className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 border ${filtroTipo.includes("transferencia") ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>Transf.</button>
            </div>
          </div>
          
          <div className="hidden lg:block w-px h-12 bg-gray-200 shrink-0"></div>
          <div className="block lg:hidden w-full h-px bg-gray-100 my-1"></div>
          
          <div className="w-full lg:flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Usuários</label>
            <div className="flex flex-wrap gap-2">
              {isLoadingData ? (
                <span className="text-sm text-gray-400 font-medium py-2">Carregando...</span>
              ) : usuariosDisponiveis.length === 0 ? (
                <span className="text-sm text-gray-400 font-medium py-2">Nenhum usuário</span>
              ) : (
                usuariosDisponiveis.map((user) => {
                  const isSelected = usuariosSelecionados.includes(user);
                  const fotoUser = mapPerfis[user];
                  return (
                    <button key={user} onClick={() => toggleUsuario(user)} className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all active:scale-95 flex items-center gap-2 ${isSelected ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 text-gray-500 flex items-center justify-center text-[10px]">
                        {fotoUser ? <img src={fotoUser} className="w-full h-full object-cover" alt="" /> : user.charAt(0).toUpperCase()}
                      </div>
                      {user}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* LISTAGEM DE TRANSAÇÕES (EXTRATO) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-2">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-800">Extrato</h3>
          </div>
          
          {isLoadingData ? (
            <div className="p-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : transacoesFiltradas.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
              <p className="text-gray-500 font-bold">Nenhum lançamento neste período.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
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
                  <li key={t.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`hidden sm:flex h-10 w-10 shrink-0 rounded-full items-center justify-center ${t.tipo === "receita" ? "bg-green-100 text-green-600" : t.tipo === "despesa" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                        {t.tipo === "receita" ? "↓" : t.tipo === "despesa" ? "↑" : "🔄"}
                      </div>
                      
                      <div className="truncate">
                        <p className="text-sm font-bold text-gray-900 truncate">{t.descricao}</p>

                        {t.tipo === "transferencia" ? (
                          <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-[12px] font-bold flex-wrap">
                            <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">🔄 Transf.</span>
                            <span className="text-gray-800 flex items-center gap-1">
                              {nomeBancoOrigem}
                              <div className="w-4 h-4 rounded-full overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-[8px]">
                                {fotoOrigem ? <img src={fotoOrigem} className="w-full h-full object-cover" alt="" /> : userOrigem.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-gray-400 mx-1">➔</span>
                              {nomeBancoDestino}
                              <div className="w-4 h-4 rounded-full overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-[8px]">
                                {fotoDestino ? <img src={fotoDestino} className="w-full h-full object-cover" alt="" /> : userDestino.charAt(0).toUpperCase()}
                              </div>
                            </span>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{veiculoOrigem}</span>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span className="text-gray-500">{formatarDataNormal(t.data)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-[12px] font-bold text-gray-500 flex-wrap">
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">{t.categorias?.nome || "Sem categoria"}</span>
                            <span className="text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">{nomeBancoOrigem}</span>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{veiculoOrigem}</span>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span>{formatarDataNormal(t.data)}</span>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] border border-blue-200" title={`@${userOrigem}`}>
                              {fotoOrigem ? <img src={fotoOrigem} className="w-full h-full object-cover" alt="" /> : userOrigem.charAt(0).toUpperCase()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-base sm:text-lg font-black ${t.tipo === "receita" ? "text-green-600" : t.tipo === "despesa" ? "text-gray-900" : "text-blue-600"}`}>
                        {t.tipo === "receita" ? "+" : t.tipo === "despesa" ? "-" : ""} {formatarMoeda(t.valor)}
                      </span>
                      <button
                        onClick={() => abrirModalEditar(t)}
                        className={`p-2 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100 ${t.user_id === userId ? "text-gray-400 hover:text-blue-600 hover:bg-blue-50" : "text-gray-200 cursor-not-allowed"}`}
                        title="Editar Lançamento"
                      >
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

      {/* BOTÃO FLUTUANTE MOBILE */}
      <button
        onClick={abrirModalNovoLancamento}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light hover:bg-blue-700 active:scale-95 z-20"
      >
        +
      </button>

      {/* ======================================================= */}
      {/* MODAL DE LANÇAMENTO E EDIÇÃO (INTELIGENTE)              */}
      {/* ======================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto custom-scrollbar">
            
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80 sticky top-0 z-[60] backdrop-blur-md">
              <h3 className="text-lg font-black text-gray-900">{editandoId ? "Editar Lançamento" : "Novo Lançamento"}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900 text-2xl font-bold">&times;</button>
            </div>

            <form onSubmit={dispararAuditoriaAtualizacao} className="p-6 space-y-4">
              <div className="flex p-1 bg-gray-200 rounded-xl relative z-0">
                <button type="button" onClick={() => { setTipo("despesa"); closeAllDropdowns(); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "despesa" ? "bg-white text-red-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Despesa</button>
                <button type="button" onClick={() => { setTipo("receita"); closeAllDropdowns(); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "receita" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Receita</button>
                <button type="button" onClick={() => { setTipo("transferencia"); closeAllDropdowns(); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${tipo === "transferencia" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>🔄 Transf.</button>
              </div>

              {tipo === "transferencia" && (
                <div className="flex items-center gap-2 bg-purple-50 p-3 rounded-xl border border-purple-100">
                  <input
                    type="checkbox"
                    id="checkFatura"
                    checked={isPagamentoFatura}
                    onChange={(e) => { setIsPagamentoFatura(e.target.checked); setBancoDestinoId(""); setFaturaDestinoId(""); }}
                    className="w-5 h-5 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="checkFatura" className="text-sm font-bold text-purple-800 cursor-pointer select-none">
                    💳 É pagamento de Fatura de Cartão?
                  </label>
                </div>
              )}

              <div className="flex gap-3 sm:gap-4 relative z-0">
                <div className="flex-[2]">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">{parcelas > 1 ? "Valor Total (R$)" : "Valor (R$)"}</label>
                  <input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-lg font-black text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" />
                </div>

                {!editandoId && tipo !== "transferencia" && (
                  <div className="flex-1">
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Vezes</label>
                    <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-black text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 appearance-none text-center">
                      {Array.from({ length: 48 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex-[2]">
                  <label className="block text-[10px] sm:text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider truncate">{parcelas > 1 ? "1ª Parcela" : "Data"}</label>
                  <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-[11px] sm:text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" />
                </div>
              </div>

              <div className="relative z-0">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Descrição</label>
                <input
                  type="text"
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder={tipo === "transferencia" ? (isPagamentoFatura ? "Ex: Pagamento Fatura Nubank..." : "Ex: Guardar Dinheiro...") : "Ex: Supermercado"}
                  className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-4">
                {tipo !== "transferencia" && (
                  <div className="relative z-0">
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Categoria</label>
                    <select required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20">
                      <option value="" disabled>Selecione...</option>
                      {categoriasFiltradas.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* CAMPO 1: BANCO ORIGEM */}
                {(tipo === "receita" || tipo === "transferencia") && (
                  <div className={`relative ${isBancoOrigemOpen ? "z-50" : "z-30"}`}>
                    <label className={`block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1 ${tipo === "receita" ? "text-green-700" : "text-purple-700"}`}>
                      🏦 {tipo === "receita" ? "Onde entrou o dinheiro?" : "De onde sai o dinheiro? (Banco)"}
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIsBancoOrigemOpen(!isBancoOrigemOpen); setIsFormaPagtoOpen(false); setIsBancoDestinoOpen(false); setIsFaturaDestinoOpen(false); }}
                      className={`flex items-center justify-between w-full rounded-xl border border-gray-300 bg-white p-2.5 focus:ring-4 transition-all h-[55px] ${tipo === "receita" ? "focus:border-green-500 focus:ring-green-500/20" : "focus:border-purple-500 focus:ring-purple-500/20"}`}
                    >
                      {bancoOrigemId ? (
                        bancoOrigemId === "dinheiro" ? (
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 text-emerald-600">💵</div>
                            <div className="flex flex-col items-start truncate text-left">
                              <span className="text-sm font-bold text-gray-900 leading-tight truncate w-full">Dinheiro Físico</span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate w-full mt-0.5">Na Carteira / Cofre</span>
                            </div>
                          </div>
                        ) : (
                          () => {
                            const b = bancos.find((x) => x.id === bancoOrigemId);
                            if (!b) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione o banco...</span>;
                            const fotoBanco = mapPerfis[b.autor_nome];
                            return (
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 text-blue-700 overflow-hidden">
                                  {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : b.autor_nome?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col items-start truncate text-left">
                                  <span className="text-sm font-bold text-gray-900 leading-tight truncate w-full flex items-center gap-1">
                                    {b.banco} <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate w-full mt-0.5">{b.nome}</span>
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
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                        <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 bg-blue-50 text-blue-800">
                          🏦 Bancos e Cofres
                        </div>
                        <ul className="divide-y divide-gray-50">
                          {bancos.filter((b) => b.ativo !== false && (!somenteMinhasContas || b.user_id === userId)).map((banco) => {
                            const temChave = contas.some((c) => c.conta_bancaria_id === banco.id && c.tipo === "corrente" && c.ativo !== false);
                            if (!temChave) return null;
                            const fotoBanco = mapPerfis[banco.autor_nome];
                            return (
                              <li key={banco.id}>
                                <button
                                  type="button"
                                  onClick={() => { setBancoOrigemId(banco.id); setFormaPagtoId(""); setIsBancoOrigemOpen(false); }}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100 bg-white"
                                >
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 text-blue-700 overflow-hidden">
                                    {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : banco.autor_nome?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col truncate">
                                    <span className="text-sm font-bold text-gray-900 truncate flex items-center gap-1">
                                      {banco.banco} <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">@{banco.autor_nome}</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">{banco.nome}</span>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                          <li key="dinheiro_origem">
                            <button
                              type="button"
                              onClick={() => { setBancoOrigemId("dinheiro"); setFormaPagtoId(""); setIsBancoOrigemOpen(false); }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100 bg-white"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 text-emerald-600">💵</div>
                              <div className="flex flex-col truncate">
                                <span className="text-sm font-bold text-gray-900 truncate">Dinheiro Físico</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">Cofre Principal</span>
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
                    <label className={`block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1 ${tipo === "despesa" ? "text-red-700" : "text-gray-500 mt-4"}`}>
                      {tipo === "despesa" ? "💳 Forma Pagto / Banco" : "↘️ Qual a forma do envio? (PIX, Deb)"}
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIsFormaPagtoOpen(!isFormaPagtoOpen); setIsBancoOrigemOpen(false); setIsBancoDestinoOpen(false); setIsFaturaDestinoOpen(false); }}
                      className={`flex items-center justify-between w-full rounded-xl border border-gray-300 bg-white p-2.5 focus:ring-4 transition-all h-[55px] ${tipo === "despesa" ? "focus:border-red-500 focus:ring-red-500/20" : "focus:border-gray-500 focus:ring-gray-500/20"}`}
                    >
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
                              <span className="text-sm font-bold text-gray-900 leading-tight truncate w-full">{selected.nome}</span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate w-full mt-0.5">{getContaSubtitle(selected)}</span>
                            </div>
                          </div>
                        );
                      })() : (
                        <span className="text-gray-400 font-bold text-sm ml-1">Selecione o meio de pagamento...</span>
                      )}
                      <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isFormaPagtoOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>

                    {isFormaPagtoOpen && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                        {tipo === "despesa" ? (
                          bancos.filter((b) => b.ativo !== false && (!somenteMinhasContas || b.user_id === userId)).map((banco) => {
                            const chavesDoBanco = contas.filter((c) => c.conta_bancaria_id === banco.id && c.ativo !== false);
                            if (chavesDoBanco.length === 0) return null;
                            return (
                              <div key={banco.id}>
                                <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 bg-blue-50 text-blue-800 flex items-center justify-between">
                                  <span>🏦 {banco.banco}</span>
                                  <span>@{banco.autor_nome}</span>
                                </div>
                                <ul className="divide-y divide-gray-50">
                                  {chavesDoBanco.map((c) => {
                                    const avatar = getContaAvatar(c);
                                    return (
                                      <li key={c.id}>
                                        <button
                                          type="button"
                                          onClick={() => { setFormaPagtoId(c.id); setIsFormaPagtoOpen(false); }}
                                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100 bg-white"
                                        >
                                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                            {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                          </div>
                                          <div className="flex flex-col truncate">
                                            <span className="text-sm font-bold text-gray-900 truncate">{c.nome}</span>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">{getContaSubtitle(c)}</span>
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
                          <ul className="divide-y divide-gray-50">
                            {contas.filter((c) => c.conta_bancaria_id === bancoOrigemId && c.tipo === "corrente" && c.ativo !== false).map((c) => {
                              const avatar = getContaAvatar(c);
                              return (
                                <li key={c.id}>
                                  <button
                                    type="button"
                                    onClick={() => { setFormaPagtoId(c.id); setIsFormaPagtoOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100 bg-white"
                                  >
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                      {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                    </div>
                                    <div className="flex flex-col truncate">
                                      <span className="text-sm font-bold text-gray-900 truncate">{c.nome}</span>
                                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">{getContaSubtitle(c)}</span>
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
                              <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 bg-emerald-50 text-emerald-800">💵 Dinheiro Físico</div>
                              <ul className="divide-y divide-gray-50">
                                {chavesDin.map((c) => {
                                  const avatar = getContaAvatar(c);
                                  return (
                                    <li key={c.id}>
                                      <button
                                        type="button"
                                        onClick={() => { setFormaPagtoId(c.id); setIsFormaPagtoOpen(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100 bg-white"
                                      >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                          {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                        </div>
                                        <div className="flex flex-col truncate">
                                          <span className="text-sm font-bold text-gray-900 truncate">{c.nome}</span>
                                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">{getContaSubtitle(c)}</span>
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
                    <div className="absolute -top-4 left-6 text-gray-300 z-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
                    </div>
                    <label className="block text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider flex items-center gap-1 pt-2 relative z-10">
                      📥 {isPagamentoFatura ? "Qual fatura você vai pagar?" : "Para qual Banco/Cofre vai?"}
                    </label>

                    {isPagamentoFatura ? (
                      <button
                        type="button"
                        onClick={() => { setIsFaturaDestinoOpen(!isFaturaDestinoOpen); setIsFormaPagtoOpen(false); setIsBancoOrigemOpen(false); }}
                        className="flex items-center justify-between w-full rounded-xl border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all h-[55px] relative z-10"
                      >
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
                                <span className="text-sm font-bold text-gray-900 leading-tight truncate w-full">{c.nome}</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate w-full mt-0.5">{getContaSubtitle(c)}</span>
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-gray-400 font-bold text-sm ml-1">Selecione a fatura...</span>
                        )}
                        <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isFaturaDestinoOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setIsBancoDestinoOpen(!isBancoDestinoOpen); setIsFormaPagtoOpen(false); setIsBancoOrigemOpen(false); }}
                        className="flex items-center justify-between w-full rounded-xl border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all h-[55px] relative z-10"
                      >
                        {bancoDestinoId ? (() => {
                          if (bancoDestinoId === "dinheiro") {
                            return (
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 text-emerald-600">💵</div>
                                <div className="flex flex-col items-start truncate text-left">
                                  <span className="text-sm font-bold text-gray-900 leading-tight truncate w-full">Dinheiro Físico</span>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate w-full mt-0.5">Na Carteira / Cofre</span>
                                </div>
                              </div>
                            );
                          }
                          const b = bancos.find((x) => x.id === bancoDestinoId);
                          if (!b) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione o banco...</span>;
                          const fotoBanco = mapPerfis[b.autor_nome];
                          return (
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 text-blue-700 overflow-hidden">
                                {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : b.autor_nome?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col items-start truncate text-left">
                                <span className="text-sm font-bold text-gray-900 leading-tight truncate w-full flex items-center gap-1">
                                  {b.banco} <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                                </span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate w-full mt-0.5">{b.nome}</span>
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
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                        <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 bg-purple-50 text-purple-800">💳 Faturas em Aberto</div>
                        <ul className="divide-y divide-gray-50">
                          {contas.filter((c) => c.tipo === "credito" && c.ativo !== false && (!somenteMinhasContas || c.user_id === userId)).map((c) => {
                            const avatar = getContaAvatar(c);
                            const faturaAtual = calcularFaturaAtual(c.id);
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => { setFaturaDestinoId(c.id); setIsFaturaDestinoOpen(false); }}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 active:bg-gray-100 bg-white"
                                >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${avatar.bg}`}>
                                      {avatar.photo ? <img src={avatar.photo} className="w-full h-full object-cover" alt="" /> : avatar.char}
                                    </div>
                                    <div className="flex flex-col truncate">
                                      <span className="text-sm font-bold text-gray-900 truncate">{c.nome}</span>
                                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">{getContaSubtitle(c)}</span>
                                    </div>
                                  </div>
                                  <span className={`text-xs font-black shrink-0 ${faturaAtual > 0 ? "text-purple-600" : "text-gray-400"}`}>
                                    {formatarMoeda(faturaAtual)}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {!isPagamentoFatura && isBancoDestinoOpen && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                        <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 bg-blue-50 text-blue-800">🏦 Bancos e Cofres Disponíveis</div>
                        <ul className="divide-y divide-gray-50">
                          {bancos.filter((b) => b.ativo !== false && b.id !== bancoOrigemId && (!somenteMinhasContas || b.user_id === userId)).map((banco) => {
                            const temChave = contas.some((c) => c.conta_bancaria_id === banco.id && c.tipo === "corrente" && c.ativo !== false);
                            if (!temChave) return null;
                            const fotoBanco = mapPerfis[banco.autor_nome];
                            return (
                              <li key={banco.id}>
                                <button
                                  type="button"
                                  onClick={() => { setBancoDestinoId(banco.id); setIsBancoDestinoOpen(false); }}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100 bg-white"
                                >
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 text-blue-700 overflow-hidden">
                                    {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : banco.autor_nome?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col truncate">
                                    <span className="text-sm font-bold text-gray-900 truncate flex items-center gap-1">
                                      {banco.banco} <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">@{banco.autor_nome}</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">{banco.nome}</span>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                          {bancoOrigemId !== "dinheiro" && (
                            <li key="dinheiro_destino">
                              <button
                                type="button"
                                onClick={() => { setBancoDestinoId("dinheiro"); setIsBancoDestinoOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100 bg-white"
                              >
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 text-emerald-600">💵</div>
                                <div className="flex flex-col truncate">
                                  <span className="text-sm font-bold text-gray-900 truncate">Dinheiro Físico</span>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">Cofre Principal</span>
                                </div>
                              </button>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 relative z-0">
                  <input type="checkbox" id="filtroContas" checked={somenteMinhasContas} onChange={(e) => setSomenteMinhasContas(e.target.checked)} className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 cursor-pointer" />
                  <label htmlFor="filtroContas" className="text-xs font-bold text-gray-500 cursor-pointer select-none">Visualizar apenas minhas contas</label>
                </div>
              </div>

              <div className="flex gap-3 pt-2 relative z-0">
                {editandoId && (
                  <button
                    type="button"
                    onClick={abrirModalDeExclusao}
                    className="px-4 py-3.5 rounded-xl font-bold transition-all active:scale-95 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 shrink-0"
                    title="Excluir Lançamento"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isProcessingAudit}
                  className={`flex-1 py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 ${tipo === "receita" ? "bg-green-600 hover:bg-green-700" : tipo === "transferencia" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`}
                >
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-blue-100">
            <div className="px-6 py-5 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2">Auditoria de Edição</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={executarSalvarTransacaoBD} className="p-6 space-y-5">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500 font-bold">Você está alterando o lançamento:</p>
                <p className="text-lg font-black text-gray-900 mt-1 truncate">{transacaoAlvo.descricao}</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Por que você está alterando os dados?</label>
                <textarea
                  required
                  rows={2}
                  value={motivoAuditoria}
                  onChange={(e) => setMotivoAuditoria(e.target.value)}
                  placeholder="Ex: Digitei o valor errado, troquei de conta..."
                  className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* MOTIVOS RECENTES DE ATUALIZAÇÃO */}
              {motivosFrequentes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-gray-600 w-full mb-1">Motivos recentes:</span>
                  {motivosFrequentes.map((motivo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMotivoAuditoria(motivo)}
                      className="text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 py-1.5 px-3 rounded-full transition-colors"
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Digite <span className="text-blue-600 font-black uppercase">ATUALIZAR</span> para confirmar
                </label>
                <input
                  type="text"
                  required
                  value={palavraConfirmacao}
                  onChange={(e) => setPalavraConfirmacao(e.target.value)}
                  placeholder="atualizar"
                  className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-black text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-center tracking-widest uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessingAudit || palavraConfirmacao.toLowerCase() !== "atualizar" || motivoAuditoria.trim() === ""}
                className="w-full py-3.5 rounded-xl text-white font-black transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
            <div className="px-6 py-5 border-b border-gray-100 bg-red-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">Apagar Lançamento</h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <form onSubmit={confirmarExclusaoComAuditoria} className="p-6 space-y-5">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500 font-bold">Você está prestes a excluir:</p>
                <p className="text-lg font-black text-gray-900 mt-1 truncate">{transacaoAlvo.descricao}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Motivo da Exclusão</label>
                <textarea
                  required
                  rows={2}
                  value={motivoAuditoria}
                  onChange={(e) => setMotivoAuditoria(e.target.value)}
                  placeholder="Por que está apagando isso?"
                  className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 resize-none"
                />
              </div>

              {/* MOTIVOS RECENTES DE EXCLUSÃO */}
              {motivosFrequentes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-gray-600 w-full mb-1">Motivos recentes:</span>
                  {motivosFrequentes.map((motivo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMotivoAuditoria(motivo)}
                      className="text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-800 py-1.5 px-3 rounded-full transition-colors"
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Digite <span className="text-red-600 font-black uppercase">EXCLUIR</span> para confirmar
                </label>
                <input
                  type="text"
                  required
                  value={palavraConfirmacao}
                  onChange={(e) => setPalavraConfirmacao(e.target.value)}
                  placeholder="excluir"
                  className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-black text-gray-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-center tracking-widest uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessingAudit || palavraConfirmacao.toLowerCase() !== "excluir" || motivoAuditoria.trim() === ""}
                className="w-full py-3.5 rounded-xl text-white font-black transition-all active:scale-95 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingAudit ? "Apagando..." : "Confirmar Exclusão"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}