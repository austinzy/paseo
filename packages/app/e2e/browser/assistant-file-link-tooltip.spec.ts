import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, type Page } from "../support/fixtures";
import { openAgentRoute, seedMockAgentWorkspace } from "../support/helpers/mock-agent";
import { seedWorkspace } from "../support/helpers/seed-client";

async function readFileLinkTooltip(page: Page): Promise<void> {
  const link = page.getByRole("link", { name: "the guide", exact: true });
  await link.hover();
  await expect(page.getByRole("tooltip")).toContainText("guide.md");
}

async function leaveFileLink(page: Page): Promise<void> {
  await page.mouse.move(5, 5);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
}

async function openLinkedFile(page: Page): Promise<void> {
  await page.getByRole("link", { name: "the guide", exact: true }).click();
  await expect(page.getByTestId("markdown-preview-frame")).toContainText("Example guide");
  await leaveFileLink(page);
}

async function returnToAgent(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Tooltip regression", exact: true }).click();
  await expect(page.getByRole("link", { name: "the guide", exact: true })).toBeVisible();
  await leaveFileLink(page);
}

async function switchToFileTab(page: Page): Promise<void> {
  await page.getByRole("button", { name: "guide.md", exact: true }).click();
  await expect(page.getByTestId("markdown-preview-frame")).toContainText("Example guide");
  await leaveFileLink(page);
}

test("opening an assistant file link dismisses its tooltip over the file tab", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const agent = await seedMockAgentWorkspace({
    repoPrefix: "tooltip-5811-",
    title: "Tooltip regression",
    featureValues: {
      mockStreamingAssistantResponse: "Read [the guide](./guide.md).",
      mockStreamingAssistantIntervalMs: 5,
    },
  });
  try {
    await writeFile(
      path.join(agent.cwd, "guide.md"),
      "# Example guide\n\n" + "Plain paragraph.\n\n".repeat(150),
    );
    await openAgentRoute(page, agent);
    await agent.client.sendAgentMessage(agent.agentId, "Show the file link.");
    await agent.client.waitForFinish(agent.agentId, 30_000);

    await readFileLinkTooltip(page);
    await leaveFileLink(page);
    await readFileLinkTooltip(page);
    await openLinkedFile(page);
    await returnToAgent(page);
    await readFileLinkTooltip(page);
    await switchToFileTab(page);
    await returnToAgent(page);
    await readFileLinkTooltip(page);
    await leaveFileLink(page);
  } finally {
    await agent.cleanup();
  }
});

async function readLinkedGuide(page: Page, linkName: string, content: string): Promise<void> {
  await page.getByRole("link", { name: linkName, exact: true }).click();
  await expect(page.getByTestId("markdown-preview-frame").filter({ visible: true })).toContainText(
    content,
  );
}

test("Windows MSYS assistant links preserve labels and open workspace files", async ({
  page,
}, testInfo) => {
  test.skip(process.platform !== "win32", "MSYS drive paths need a Windows host.");
  testInfo.setTimeout(120_000);
  const workspace = await seedWorkspace({
    repoPrefix: "msys-file-link-",
    repo: { files: [{ path: "guide.md", content: "# MSYS guide destination\n\nDetails\n" }] },
  });
  try {
    const filePath = path.join(workspace.repoPath, "guide.md");
    const normalizedPath = filePath.replace(/\\/g, "/");
    const msysPath = normalizedPath.replace(
      /^([A-Za-z]):\//,
      (_, drive: string) => `/${drive.toLowerCase()}/`,
    );
    const displayPath = `${filePath.replace(/^[a-z]/, (drive) => drive.toUpperCase())}:3`;
    const response = [
      `[the **guide**](${msysPath}#L3 "Guide details")`,
      `[\`guide.md\`](${msysPath})`,
      `Plain path: ${msysPath}:3`,
      `Code path: \`${msysPath}:3\``,
    ].join("\n\n");
    const agent = await workspace.client.createAgent({
      provider: "mock",
      cwd: workspace.repoPath,
      workspaceId: workspace.workspaceId,
      title: "MSYS file links",
      modeId: "load-test",
      model: "e2e-fast-stream",
      featureValues: {
        mockStreamingAssistantResponse: response,
        mockStreamingAssistantIntervalMs: 5,
      },
    });
    await openAgentRoute(page, { workspaceId: workspace.workspaceId, agentId: agent.id });
    await workspace.client.sendAgentMessage(agent.id, "Show the Windows file links.");
    await workspace.client.waitForFinish(agent.id, 30_000);

    const authoredLink = page.getByRole("link", { name: "the guide", exact: true });
    await expect(authoredLink).toBeVisible();
    await expect(authoredLink.locator("strong")).toHaveText("guide");
    await expect(authoredLink).toHaveAttribute("title", "Guide details");
    await expect(
      page.getByRole("link", { name: "guide.md", exact: true }).locator("code"),
    ).toHaveText("guide.md");

    const pathLinks = page.getByRole("link", { name: displayPath, exact: true });
    await expect(pathLinks).toHaveCount(2);
    await expect(pathLinks.locator("code")).toHaveText(displayPath);
    await authoredLink.hover();
    await expect(page.getByRole("tooltip")).toHaveText("guide.md:3");
    await leaveFileLink(page);
    await page.screenshot({ path: testInfo.outputPath("msys-file-links.png") });

    for (const link of [authoredLink, pathLinks.nth(0), pathLinks.nth(1)]) {
      await link.click();
      await expect(
        page.getByTestId("file-source-editor").filter({ visible: true }).locator(".cm-content"),
      ).toContainText("MSYS guide destination");
      await page.getByRole("button", { name: "MSYS file links", exact: true }).click();
      await expect(authoredLink).toBeVisible();
      await leaveFileLink(page);
    }
  } finally {
    await workspace.cleanup();
  }
});

async function returnToNestedLinks(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Nested file links", exact: true }).click();
  await expect(page.getByRole("link", { name: "nested guide", exact: true })).toBeVisible();
}

test("assistant directory paths find nested files and preserve exact workspace paths", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const agent = await seedMockAgentWorkspace({
    repoPrefix: "nested-file-link-",
    title: "Nested file links",
    featureValues: {
      mockStreamingAssistantResponse:
        "Read [nested guide](schema/x.md), [exact guide](schema/exact.md), and [missing guide](schema/missing.md).",
      mockStreamingAssistantIntervalMs: 5,
    },
  });
  try {
    await mkdir(path.join(agent.cwd, "repo-a/schema"), { recursive: true });
    execFileSync("git", ["init", "-b", "main"], { cwd: path.join(agent.cwd, "repo-a") });
    await writeFile(
      path.join(agent.cwd, "repo-a/schema/x.md"),
      "# Nested file content\n\nDetails\n",
    );
    await mkdir(path.join(agent.cwd, "schema"), { recursive: true });
    await writeFile(path.join(agent.cwd, "schema/exact.md"), "# Exact file content\n");
    await writeFile(path.join(agent.cwd, "repo-a/schema/exact.md"), "# Wrong nested content\n");
    await openAgentRoute(page, agent);
    await agent.client.sendAgentMessage(agent.agentId, "Show the file links.");
    await agent.client.waitForFinish(agent.agentId, 30_000);

    await expect(page.getByRole("textbox", { name: "Message agent..." }).first()).toBeEnabled();
    await readLinkedGuide(page, "nested guide", "Nested file content");
    await returnToNestedLinks(page);
    await readLinkedGuide(page, "exact guide", "Exact file content");
    await returnToNestedLinks(page);
    await page.getByRole("link", { name: "missing guide", exact: true }).click();
    await expect(page.getByText("File not found", { exact: true })).toBeVisible();
  } finally {
    await agent.cleanup();
  }
});
