import "server-only";

/** Envia texto para o Slack. Sem SLACK_WEBHOOK_URL, só escreve no log. */
export async function notifySlack(text: string): Promise<boolean> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    console.log(`[slack desligado] ${text}`);
    return false;
  }
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Slack respondeu ${response.status}: ${await response.text()}`);
  }
  return true;
}
