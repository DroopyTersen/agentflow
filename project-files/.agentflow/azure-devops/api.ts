#!/usr/bin/env bun
/**
 * Azure DevOps REST API helper for operations the CLI can't handle.
 *
 * Usage:
 *   bun .agentflow/azure-devops/api.ts tag remove 123 needs-feedback
 *   bun .agentflow/azure-devops/api.ts tag set 123 "tag1; tag2"
 *   bun .agentflow/azure-devops/api.ts field set 123 "System.Tags" "value"
 */

import { $ } from "bun";

interface AzureDevOpsConfig {
  organization: string;
  project: string;
  team: string;
  board: string;
  areaPath: string;
  iterationPath: string;
  workItemType: string;
  boardColumnField: string;
  boardColumnDoneField: string;
  boardColumns: Record<string, string>;
  boardColumnDone: Record<string, boolean>;
}

async function loadConfig(): Promise<AzureDevOpsConfig> {
  const file = Bun.file(".agentflow/azure-devops.json");
  if (!(await file.exists())) {
    throw new Error("No .agentflow/azure-devops.json found");
  }
  return await file.json();
}

async function getAccessToken(): Promise<string> {
  // Azure DevOps resource ID
  const resource = "499b84ac-1321-427f-aa17-267ca6975798";
  const result = await $`az account get-access-token --resource ${resource} --query accessToken -o tsv`.text();
  return result.trim();
}

async function patchWorkItem(
  config: AzureDevOpsConfig,
  workItemId: number,
  operations: Array<{ op: string; path: string; value?: string }>
): Promise<any> {
  const token = await getAccessToken();
  const url = `${config.organization}/_apis/wit/workitems/${workItemId}?api-version=7.0`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json-patch+json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(operations),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return await response.json();
}

async function getWorkItem(config: AzureDevOpsConfig, workItemId: number): Promise<any> {
  const token = await getAccessToken();
  const url = `${config.organization}/_apis/wit/workitems/${workItemId}?api-version=7.0`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return await response.json();
}

async function tagRemove(workItemId: number, tagToRemove: string): Promise<void> {
  const config = await loadConfig();
  const workItem = await getWorkItem(config, workItemId);
  const currentTags: string = workItem.fields["System.Tags"] || "";

  // Parse tags (semicolon-separated, may have spaces)
  const tags = currentTags
    .split(";")
    .map((t: string) => t.trim())
    .filter((t: string) => t && t.toLowerCase() !== tagToRemove.toLowerCase());

  const newTags = tags.join("; ");

  const result = await patchWorkItem(config, workItemId, [
    { op: "replace", path: "/fields/System.Tags", value: newTags },
  ]);

  console.log(`Removed tag "${tagToRemove}" from #${workItemId}`);
  console.log(`Tags now: ${result.fields["System.Tags"] || "(none)"}`);
}

async function tagSet(workItemId: number, tags: string): Promise<void> {
  const config = await loadConfig();

  const result = await patchWorkItem(config, workItemId, [
    { op: "replace", path: "/fields/System.Tags", value: tags },
  ]);

  console.log(`Set tags on #${workItemId}`);
  console.log(`Tags now: ${result.fields["System.Tags"] || "(none)"}`);
}

async function fieldSet(workItemId: number, field: string, value: string): Promise<void> {
  const config = await loadConfig();

  const result = await patchWorkItem(config, workItemId, [
    { op: "replace", path: `/fields/${field}`, value },
  ]);

  console.log(`Set ${field}="${value}" on #${workItemId}`);
}

// CLI
const [command, subcommand, ...args] = Bun.argv.slice(2);

if (command === "tag" && subcommand === "remove" && args.length === 2) {
  await tagRemove(parseInt(args[0]), args[1]);
} else if (command === "tag" && subcommand === "set" && args.length === 2) {
  await tagSet(parseInt(args[0]), args[1]);
} else if (command === "field" && subcommand === "set" && args.length === 3) {
  await fieldSet(parseInt(args[0]), args[1], args[2]);
} else {
  console.log(`Usage:
  bun api.ts tag remove <id> <tag>     Remove a tag from work item
  bun api.ts tag set <id> "tags"       Set all tags (semicolon-separated)
  bun api.ts field set <id> <field> <value>  Set any field value
`);
  process.exit(1);
}
