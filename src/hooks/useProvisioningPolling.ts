/**
 * Polling do status de provisionamento.
 *
 * O provisionamento é assíncrono e leva minutos — sem isso a tela congela no
 * estado do primeiro carregamento e o usuário precisa apertar "Atualizar" na
 * mão para descobrir que algo mudou.
 *
 * Intervalo de 5s, alinhado ao mecanismo que o `pas-cockpit-worker` já usa para
 * consultar o Temporal. **Não é WebSocket** — a comunicação é unidirecional e
 * o projeto não tem suporte a socket; decisão registrada no handoff 19/08/2026.
 *
 * O polling para sozinho quando o estado é terminal — nunca fica pedindo
 * indefinidamente — e o timer é limpo no unmount.
 */

import { useEffect, useRef } from 'react'

/** Mesmo intervalo usado pelo worker ao consultar o Temporal. */
export const PROVISIONING_POLL_INTERVAL_MS = 5_000

export function useProvisioningPolling({
  enabled,
  onPoll,
  intervalMs = PROVISIONING_POLL_INTERVAL_MS,
}: {
  /**
   * false assim que o estado for terminal (concluído ou falho). O hook não
   * decide o que é terminal — quem chama sabe se olha Fase 1, Fase 2 ou ambas.
   */
  enabled: boolean
  onPoll: () => void
  intervalMs?: number
}): void {
  // Ref evita reiniciar o timer a cada render quando `onPoll` é uma closure nova.
  const onPollRef = useRef(onPoll)
  onPollRef.current = onPoll

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => onPollRef.current(), intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs])
}
