import test from "node:test"
import assert from "node:assert/strict"

import {
  consumeGenerationQueueItemCredits,
  resolveFailedGenerationCreditStatus,
} from "@/lib/generation/queue-credit-flow"

test("consumeGenerationQueueItemCredits records the Generate All credit consumption request", async () => {
  const rpcCalls: Array<{ name: string; params: Record<string, unknown> }> = []
  const supabase = {
    async rpc(name: string, params: Record<string, unknown>) {
      rpcCalls.push({ name, params })
      return { data: true, error: null }
    },
  } as never

  const result = await consumeGenerationQueueItemCredits({
    supabase,
    userId: "user-1",
    amount: 12,
    action: "prd",
    label: "Product Plan",
    projectName: "Acme",
  })

  assert.deepEqual(result, { consumed: true, errorMessage: null })
  assert.deepEqual(rpcCalls, [
    {
      name: "consume_credits",
      params: {
        p_user_id: "user-1",
        p_amount: 12,
        p_action: "prd",
        p_description: 'Product Plan for "Acme" (Generate All)',
      },
    },
  ])
})

test("consumeGenerationQueueItemCredits returns plan-language failures", async () => {
  const supabase = {
    async rpc() {
      return { data: false, error: null }
    },
  } as never

  const result = await consumeGenerationQueueItemCredits({
    supabase,
    userId: "user-1",
    amount: 12,
    action: "tech-spec",
    label: "Technical Spec",
    projectName: "Acme",
  })

  assert.deepEqual(result, {
    consumed: false,
    errorMessage: "You've reached your plan limit. Upgrade to continue.",
  })
})

test("resolveFailedGenerationCreditStatus refunds a charged failed generation", async () => {
  const refunds: Array<{ creditCost: number; description: string }> = []
  const status = await resolveFailedGenerationCreditStatus({
    billingSupabase: {} as never,
    item: {
      user_id: "user-1",
      credit_cost: 12,
      credit_status: "charged",
      doc_type: "prd",
      label: "Product Plan",
    },
    creditCost: 12,
    charged: true,
    wasCancelled: false,
    refundItemCredits: async (_supabase, item, description) => {
      refunds.push({ creditCost: item.credit_cost, description })
      return { refunded: true, error: null }
    },
  })

  assert.equal(status, "refunded")
  assert.deepEqual(refunds, [
    {
      creditCost: 12,
      description: "Product Plan failed: credits refunded (Generate All)",
    },
  ])
})

test("resolveFailedGenerationCreditStatus marks refund failures explicitly", async () => {
  let loggedError: unknown
  const status = await resolveFailedGenerationCreditStatus({
    billingSupabase: {} as never,
    item: {
      user_id: "user-1",
      credit_cost: 12,
      credit_status: "charged",
      doc_type: "prd",
      label: "Product Plan",
    },
    creditCost: 12,
    charged: true,
    wasCancelled: true,
    refundItemCredits: async () => ({ refunded: false, error: "rpc failed" }),
    logRefundError: (error) => {
      loggedError = error
    },
  })

  assert.equal(status, "refund_failed")
  assert.equal(loggedError, "rpc failed")
})
