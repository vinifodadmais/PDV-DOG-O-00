import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { generateId } from "@/utils/id";
import { formatarMoeda, arredondarMoeda } from "@/utils/currency";
import type { NovoPagamentoInput } from "@/services";
import type { FormaPagamento, Pedido } from "@/types";

type MetodoPagamento = "dinheiro" | "pix" | "debito" | "credito" | "misto";

interface LinhaMisto {
  id: string;
  forma: FormaPagamento;
  valor: string;
}

interface PagamentoModalProps {
  open: boolean;
  total: number;
  processando: boolean;
  erro: string | null;
  pedidoFinalizado: Pedido | null;
  statusImpressao?: "ocioso" | "imprimindo" | "sucesso" | "erro";
  erroImpressao?: string | null;
  onClose: () => void;
  onConfirmarPagamento: (pagamentos: NovoPagamentoInput[]) => void;
  onNovaVenda: () => void;
  onReimprimir?: () => void;
}

const METODOS: { id: MetodoPagamento; label: string; emoji: string }[] = [
  { id: "dinheiro", label: "Dinheiro", emoji: "💵" },
  { id: "pix", label: "Pix", emoji: "📱" },
  { id: "debito", label: "Débito", emoji: "💳" },
  { id: "credito", label: "Crédito", emoji: "💳" },
  { id: "misto", label: "Misto", emoji: "🔄" },
];

const FORMAS_SIMPLES: { id: FormaPagamento; label: string; emoji: string }[] = [
  { id: "dinheiro", label: "Dinheiro", emoji: "💵" },
  { id: "pix", label: "Pix", emoji: "📱" },
  { id: "debito", label: "Débito", emoji: "💳" },
  { id: "credito", label: "Crédito", emoji: "💳" },
];

const ROTULOS_FORMA: Record<FormaPagamento, string> = {
  dinheiro: "💵 Dinheiro",
  pix: "📱 Pix",
  debito: "💳 Débito",
  credito: "💳 Crédito",
  outro: "Outro",
};

const campoClassName =
  "rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";

function paraNumero(texto: string): number {
  const valor = Number(texto.replace(",", "."));
  return Number.isFinite(valor) ? valor : 0;
}

export function PagamentoModal({
  open,
  total,
  processando,
  erro,
  pedidoFinalizado,
  statusImpressao = "ocioso",
  erroImpressao = null,
  onClose,
  onConfirmarPagamento,
  onNovaVenda,
  onReimprimir,
}: PagamentoModalProps) {
  const [metodo, setMetodo] = useState<MetodoPagamento>("dinheiro");
  const [valorRecebido, setValorRecebido] = useState("");
  const [linhasMisto, setLinhasMisto] = useState<LinhaMisto[]>([]);

  useEffect(() => {
    if (!open) return;
    setMetodo("dinheiro");
    setValorRecebido("");
    setLinhasMisto([
      { id: generateId(), forma: "pix", valor: "" },
      { id: generateId(), forma: "dinheiro", valor: "" },
    ]);
  }, [open]);

  const recebido = paraNumero(valorRecebido);
  const troco = arredondarMoeda(recebido - total);
  const dinheiroSuficiente = arredondarMoeda(recebido) >= arredondarMoeda(total);

  const somaMisto = arredondarMoeda(
    linhasMisto.reduce((soma, linha) => soma + paraNumero(linha.valor), 0)
  );
  const diferencaMisto = arredondarMoeda(total - somaMisto);
  const mistoValido =
    Math.abs(diferencaMisto) < 0.005 &&
    linhasMisto.length > 0 &&
    linhasMisto.every((linha) => paraNumero(linha.valor) > 0);

  const podeFinalizar =
    metodo === "dinheiro"
      ? dinheiroSuficiente
      : metodo === "misto"
        ? mistoValido
        : total >= 0;

  function atualizarLinhaMisto(id: string, patch: Partial<LinhaMisto>) {
    setLinhasMisto((atual) =>
      atual.map((linha) => (linha.id === id ? { ...linha, ...patch } : linha))
    );
  }

  function adicionarLinhaMisto() {
    setLinhasMisto((atual) => [...atual, { id: generateId(), forma: "dinheiro", valor: "" }]);
  }

  function removerLinhaMisto(id: string) {
    setLinhasMisto((atual) => atual.filter((linha) => linha.id !== id));
  }

  function handleFinalizarClick() {
    if (!podeFinalizar) return;

    let pagamentos: NovoPagamentoInput[];
    if (metodo === "dinheiro") {
      pagamentos = [
        {
          forma: "dinheiro",
          valor: arredondarMoeda(recebido),
          troco: troco > 0 ? troco : 0,
        },
      ];
    } else if (metodo === "misto") {
      pagamentos = linhasMisto.map((linha) => ({
        forma: linha.forma,
        valor: arredondarMoeda(paraNumero(linha.valor)),
      }));
    } else {
      pagamentos = [{ forma: metodo, valor: total }];
    }

    onConfirmarPagamento(pagamentos);
  }

  // Tela de confirmação, exibida depois que a venda é finalizada com sucesso.
  if (pedidoFinalizado) {
    const trocoTotal = pedidoFinalizado.pagamentos.reduce(
      (soma, pagamento) => soma + (pagamento.troco ?? 0),
      0
    );

    return (
      <Modal open={open} onClose={onNovaVenda} title="Venda finalizada" widthClassName="max-w-md">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-mustard/15 text-brand-mustard">
            <Icon name="check" size={28} />
          </div>
          <div>
            <p className="display-title text-lg text-brand-white">
              Pedido #{pedidoFinalizado.numero}
            </p>
            <p className="text-sm text-charcoal-400">Venda finalizada com sucesso</p>
          </div>

          <div className="w-full space-y-1.5 rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3 text-left text-sm">
            {pedidoFinalizado.itens.map((item) => (
              <div key={item.id} className="flex justify-between text-charcoal-300">
                <span>
                  {item.quantidade}x {item.produtoNome}
                </span>
                <span className="tabular-nums">{formatarMoeda(item.subtotal)}</span>
              </div>
            ))}

            <div className="flex justify-between border-t border-charcoal-700 pt-1.5 font-semibold text-brand-white">
              <span>Total pago</span>
              <span className="tabular-nums">{formatarMoeda(pedidoFinalizado.total)}</span>
            </div>

            {pedidoFinalizado.pagamentos.map((pagamento) => (
              <div key={pagamento.id} className="flex justify-between text-xs text-charcoal-400">
                <span>{ROTULOS_FORMA[pagamento.forma]}</span>
                <span className="tabular-nums">{formatarMoeda(pagamento.valor)}</span>
              </div>
            ))}

            {trocoTotal > 0 && (
              <div className="flex justify-between text-xs font-medium text-brand-mustard">
                <span>Troco</span>
                <span className="tabular-nums">{formatarMoeda(trocoTotal)}</span>
              </div>
            )}
          </div>

          <div className="w-full">
            {statusImpressao === "imprimindo" && (
              <p className="flex items-center justify-center gap-2 text-xs text-charcoal-400">
                <Icon name="printer" size={14} className="shrink-0 animate-pulse" />
                Imprimindo comprovante...
              </p>
            )}
            {statusImpressao === "sucesso" && (
              <p className="flex items-center justify-center gap-2 text-xs text-brand-mustard">
                <Icon name="printer" size={14} className="shrink-0" />
                Comprovante impresso
              </p>
            )}
            {statusImpressao === "erro" && (
              <div className="space-y-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-left">
                <p className="flex items-start gap-2 text-xs text-brand-red-light">
                  <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                  <span>
                    A venda foi registrada normalmente, mas a impressão falhou: {erroImpressao}
                  </span>
                </p>
                {onReimprimir && (
                  <button
                    type="button"
                    onClick={onReimprimir}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-mustard hover:opacity-80"
                  >
                    <Icon name="printer" size={13} />
                    Tentar imprimir novamente
                  </button>
                )}
              </div>
            )}
            {statusImpressao === "ocioso" && onReimprimir && (
              <button
                type="button"
                onClick={onReimprimir}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-charcoal-400 transition-colors hover:text-brand-white"
              >
                <Icon name="printer" size={13} />
                Imprimir comprovante
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNovaVenda}
            className="w-full rounded-md bg-brand-red py-3 text-sm font-bold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red-dark"
          >
            Nova Venda
          </button>
        </div>
      </Modal>
    );
  }

  // Tela de seleção da forma de pagamento.
  return (
    <Modal open={open} onClose={onClose} title="Pagamento" widthClassName="max-w-lg">
      <div className="space-y-4">
        <div className="rounded-md border border-charcoal-800 bg-charcoal-800/50 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-charcoal-400">Total a pagar</p>
          <p className="display-title text-3xl text-brand-white">{formatarMoeda(total)}</p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {METODOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMetodo(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border px-1 py-2.5 text-[11px] font-semibold transition-colors",
                metodo === item.id
                  ? "border-brand-red bg-brand-red/15 text-brand-white"
                  : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
              )}
            >
              <span className="text-lg leading-none">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>

        {metodo === "dinheiro" && (
          <div className="space-y-2 rounded-md border border-charcoal-800 p-3">
            <label htmlFor="valor-recebido" className="block text-xs font-medium text-charcoal-300">
              Valor recebido
            </label>
            <input
              id="valor-recebido"
              type="number"
              min={0}
              step={0.01}
              value={valorRecebido}
              onChange={(event) => setValorRecebido(event.target.value)}
              placeholder="0,00"
              autoFocus
              className={cn(campoClassName, "w-full")}
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-charcoal-400">Troco</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  troco < 0 ? "text-brand-red-light" : "text-brand-mustard"
                )}
              >
                {formatarMoeda(Math.max(troco, 0))}
              </span>
            </div>
            {valorRecebido !== "" && !dinheiroSuficiente && (
              <p className="flex items-center gap-1.5 text-xs text-brand-red-light">
                <Icon name="alert" size={13} className="shrink-0" />
                Valor insuficiente para cobrir o total.
              </p>
            )}
          </div>
        )}

        {(metodo === "pix" || metodo === "debito" || metodo === "credito") && (
          <div className="rounded-md border border-charcoal-800 p-3 text-sm text-charcoal-300">
            {metodo === "pix" &&
              "Confirme que o Pix foi recebido antes de finalizar a venda."}
            {metodo === "debito" &&
              "Passe o cartão na maquininha e confirme para registrar o pagamento no débito."}
            {metodo === "credito" &&
              "Passe o cartão na maquininha e confirme para registrar o pagamento no crédito."}
          </div>
        )}

        {metodo === "misto" && (
          <div className="space-y-2 rounded-md border border-charcoal-800 p-3">
            <p className="text-xs font-medium text-charcoal-300">
              Dividir pagamento entre formas
            </p>

            {linhasMisto.map((linha) => (
              <div key={linha.id} className="flex items-center gap-2">
                <select
                  value={linha.forma}
                  onChange={(event) =>
                    atualizarLinhaMisto(linha.id, {
                      forma: event.target.value as FormaPagamento,
                    })
                  }
                  className={cn(campoClassName, "flex-1")}
                >
                  {FORMAS_SIMPLES.map((forma) => (
                    <option key={forma.id} value={forma.id}>
                      {forma.emoji} {forma.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={linha.valor}
                  onChange={(event) =>
                    atualizarLinhaMisto(linha.id, { valor: event.target.value })
                  }
                  placeholder="0,00"
                  className={cn(campoClassName, "w-24 text-right")}
                />
                <button
                  type="button"
                  onClick={() => removerLinhaMisto(linha.id)}
                  disabled={linhasMisto.length <= 1}
                  className="shrink-0 rounded p-1.5 text-charcoal-500 transition-colors hover:text-brand-red disabled:pointer-events-none disabled:opacity-30"
                  aria-label="Remover forma de pagamento"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={adicionarLinhaMisto}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-mustard transition-opacity hover:opacity-80"
            >
              <Icon name="plus" size={12} />
              Adicionar forma de pagamento
            </button>

            <div className="flex items-center justify-between border-t border-charcoal-800 pt-2 text-sm">
              <span className="text-charcoal-400">Valor pago</span>
              <span className="font-semibold tabular-nums text-brand-white">
                {formatarMoeda(somaMisto)}
              </span>
            </div>

            {!mistoValido && (
              <p className="flex items-center gap-1.5 text-xs text-brand-red-light">
                <Icon name="alert" size={13} className="shrink-0" />
                {diferencaMisto > 0
                  ? `Faltam ${formatarMoeda(diferencaMisto)} para completar o total.`
                  : `O valor pago excede o total em ${formatarMoeda(Math.abs(diferencaMisto))}.`}
              </p>
            )}
          </div>
        )}

        {erro && (
          <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
            <Icon name="alert" size={14} className="shrink-0" />
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={processando}
            className="rounded-md border border-charcoal-700 px-4 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleFinalizarClick}
            disabled={!podeFinalizar || processando}
            className="rounded-md bg-brand-red px-5 py-2 text-sm font-bold text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {processando ? "Finalizando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
